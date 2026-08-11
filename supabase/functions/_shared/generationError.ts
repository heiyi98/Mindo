// 三分类失败处理的公共逻辑，5个generate-*函数共用。
// 单次调用失败时不在函数内部重试，只分类记录，交给reading-recovery定时任务下一轮重新触发。

import { notifyAdminAlert } from "./alerts.ts";

export type GeminiFailureKind = "content_policy" | "api_key_invalid" | "technical";

// Gemini调用本身失败（内容政策拦截/密钥或配额问题/其余技术性问题），由callGeminiOnce抛出
export class GeminiCallError extends Error {
  kind: GeminiFailureKind;
  constructor(kind: GeminiFailureKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

// 传入数据缺失/损坏（该读到的draft/前置主题字段读不到），跟Gemini调用本身无关
export class DataMissingError extends Error {}

const CONTENT_POLICY_MAX = 5;

export async function callGeminiOnce(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
): Promise<string> {
  const controller = new AbortController();
  // Supabase免费版Edge Function总执行时长上限150秒，留约50秒给读取数据/解析/写库等其余步骤
  const timeout = setTimeout(() => controller.abort(), 100000);
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { temperature: 1.0 },
        }),
        signal: controller.signal,
      },
    );
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new GeminiCallError("technical", "Gemini调用超时（100秒）");
    }
    throw new GeminiCallError("technical", e instanceof Error ? e.message : String(e));
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 || response.status === 403) {
    const errText = await response.text();
    throw new GeminiCallError("api_key_invalid", `Gemini API错误 ${response.status}: ${errText}`);
  }

  if (!response.ok) {
    const errText = await response.text();
    if (/quota|api[_ ]?key/i.test(errText)) {
      throw new GeminiCallError("api_key_invalid", `Gemini API错误 ${response.status}: ${errText}`);
    }
    throw new GeminiCallError("technical", `Gemini API错误 ${response.status}: ${errText}`);
  }

  const data = await response.json();

  const blockReason = data?.promptFeedback?.blockReason;
  const finishReason = data?.candidates?.[0]?.finishReason;
  if (blockReason || finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT" || finishReason === "RECITATION") {
    throw new GeminiCallError(
      "content_policy",
      `内容政策拦截: blockReason=${blockReason ?? "n/a"} finishReason=${finishReason ?? "n/a"}`,
    );
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiCallError("technical", "Gemini返回内容为空");
  }
  return text;
}

// 每个generate-*函数的catch块统一调用这个：按错误分类更新bazi_readings/system_alerts，
// 正常返回（不再往上抛），调用方的Deno.serve处理器本身始终200，不受这里影响。
export async function handleGenerationFailure(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  readingId: string,
  stageLabel: string, // 日志用，比如"Phase 1"/"Theme 2"
  error: unknown,
): Promise<void> {
  const nowIso = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${readingId}] ${stageLabel} 失败:`, message);

  if (error instanceof DataMissingError) {
    await supabase.from("bazi_readings")
      .update({ alert_status: "data_missing", last_attempt_at: nowIso })
      .eq("id", readingId);
    await supabase.from("system_alerts").insert({ reading_id: readingId, alert_type: "data_missing", message });
    await notifyAdminAlert("data_missing", message, readingId);
    return;
  }

  if (error instanceof GeminiCallError && error.kind === "api_key_invalid") {
    await supabase.from("bazi_readings")
      .update({ alert_status: "api_key_invalid", last_attempt_at: nowIso })
      .eq("id", readingId);
    await supabase.from("system_alerts").insert({ reading_id: readingId, alert_type: "api_key_invalid", message });
    await notifyAdminAlert("api_key_invalid", message, readingId);
    return;
  }

  if (error instanceof GeminiCallError && error.kind === "content_policy") {
    const { data: row } = await supabase
      .from("bazi_readings")
      .select("content_policy_retry_count")
      .eq("id", readingId)
      .single();
    const nextCount = (row?.content_policy_retry_count ?? 0) + 1;

    if (nextCount < CONTENT_POLICY_MAX) {
      await supabase.from("bazi_readings")
        .update({ content_policy_retry_count: nextCount, last_attempt_at: nowIso })
        .eq("id", readingId);
    } else {
      await supabase.from("bazi_readings")
        .update({ content_policy_retry_count: nextCount, last_attempt_at: nowIso, alert_status: "content_policy_exceeded" })
        .eq("id", readingId);
      await supabase.from("system_alerts").insert({ reading_id: readingId, alert_type: "content_policy_exceeded", message });
      await notifyAdminAlert("content_policy_exceeded", message, readingId);
    }
    return;
  }

  // 其余技术性失败（超时/503/429/返回内容为空/JSON解析失败/输出结构不对等）
  const { data: row } = await supabase
    .from("bazi_readings")
    .select("retry_count")
    .eq("id", readingId)
    .single();
  const nextCount = (row?.retry_count ?? 0) + 1;
  await supabase.from("bazi_readings")
    .update({ retry_count: nextCount, last_attempt_at: nowIso })
    .eq("id", readingId);
}
