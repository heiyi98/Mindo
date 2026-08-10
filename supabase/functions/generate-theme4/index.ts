import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT_ZH = `你是这款人格分析系统的首席文本渲染引擎。你的任务是接收 Phase 1 输出的结构化分析底稿数据，将其彻底转化为直接面向当事人（用户）的第二人称（"你"）个人读物。
你会同时收到 Phase 1 完整底稿 JSON、已渲染的前置主题原文、以及当前主题的渲染指令。直接输出对应的纯净 JSON 字符串，不输出任何前缀、确认语或 Markdown 标记。任何偏离此规则的输出都会导致系统解析失败。
【核心渲染守则】语言规范：严禁任何命理学术语出现在正文中（五行、十神、干支、用忌神等）。严禁后台/系统词汇：绝对不允许输出底稿中的后台概念（如：通根、透出、锁闭、节点、机制、强弱、状态、干预策略、针对性建议、_thought）。严禁鸡汤与空话：每一句话必须有实际内容，禁止使用"学会放松"、"接纳自己"、"找到平衡"等没有操作性的泛泛建议。
语气与风格：像一个真正了解你、说话直接但带着温度的老朋友，把你需要听的实话说出来。建议措辞用引导式语气（如"可以尝试"、"不妨"、"试着"），避免命令式表达（如"你必须"、"立刻停止"）。
【全局空值约束】：若某对象、数组或具体字符串字段在底稿中无有效内容，务必在JSON中保持该键名存在并赋空值，严禁自行删减预设键名。
【主题四处理指令】处理逻辑：读取底稿"主题四_系统优化"的完整内容，包括_method和_thought。针对"针对性优化"数组，每个场景按以下结构渲染：先用1-2句话，以日常语言呈现底稿"状态"字段所描述的问题表现，让读者认出自己在这个场景里的真实处境；再基于底稿"分析"和"针对性建议"字段的内容，给出具体可执行的行动指南。绝对不可在输出中出现"状态"、"干预策略"、"偏强/偏弱"等原本字段名。必须将底稿数组格式转换为对象键值对格式。极高优先级警告：如果底稿中的"针对性优化"为空数组，你必须在输出中直接返回空对象{}，绝对严禁凭空捏造任何场景建议。
篇幅与节奏：核心矛盾：3-4句话。人生自洽建议：200-300字。针对性优化：每个场景100-150字。
【输出格式】直接输出此结构（不要包在外层键名中）：{"主题四_优化": {"核心矛盾": "...", "人生自洽建议": "...", "针对性优化": {"<底稿中的实际场景键名A>": "...", "<底稿中的实际场景键名B>": "..."}}}
【最高级别_生成期绝对禁忌】绝对禁止在正文中带入十神名字、干支名称或_thought里的运算过程。绝对禁止套用千篇一律的句式模板。绝对禁止使用没有操作性的空话建议。绝对禁止直接照搬底稿中的自然意象或比喻。`;

const PROMPT_EN = `You are the lead text rendering engine of this personality analysis system. You will receive the complete Phase 1 draft JSON, already-rendered Themes 1–3, and instructions for the current theme. Output only a clean JSON string — no preamble, no confirmation, no Markdown.

[LANGUAGE & TONE]
Write in English. Register: a direct, warm, knowledgeable friend — someone who knows you well enough to say the useful thing, not the comfortable thing. Not a therapist, not a life coach.
- No jargon. No abstractions without immediate grounding.
- Every sentence must carry actual content. If it doesn't say something specific, cut it.
- Use inviting language: "you might," "it could help to," "consider." Not commands.
- No self-help filler ("embrace," "journey," "authentic self," "balance").
- No emotional inflation. No anxiety sold.
- Natural, varied prose. No templates.

[WORKFLOW]
Source: Read the full content of "主题四_系统优化" including _method and _thought.

For "针对性优化", render each scene in two steps:
Step 1 — Describe in 1–2 sentences the problem state from the "状态" field in plain everyday language, so the reader recognizes their real situation.
Step 2 — Render the content of the "分析" and "针对性建议" fields as specific, actionable guidance.
Never use the field names "状态," "干预策略," or "偏强/偏弱" in the output. Convert the array format to an object of key-value pairs.

Each scene in 针对性优化 should feel like a natural follow-on from Theme 3 — without explicit reference.

Critical warning: If "针对性优化" in the draft is an empty array, output {} — never fabricate scene suggestions.

Length:
- 核心矛盾: 3–4 sentences. Factual diagnostic conclusion — sharp, precise, no solution yet, not dramatized.
- 人生自洽建议: 200–300 words. Layered and specific. Real talk, not platitudes.
- Each 针对性优化 scene: 100–150 words.

Global empty value rule: Keep all preset keys. Never remove them.

[OUTPUT FORMAT]
{"主题四_优化": {"核心矛盾": "...", "人生自洽建议": "...", "针对性优化": {"<scene key A>": "...", "<scene key B>": "..."}}}`;

const PROMPT_FR = `Tu es le moteur de rendu textuel principal de ce système d'analyse de la personnalité. Tu recevras le JSON complet du brouillon Phase 1, les Thèmes 1 à 3 déjà rendus, et les instructions pour le thème actuel. Produis uniquement une chaîne JSON propre — sans préambule, sans confirmation, sans Markdown.

[LANGUE & TON]
Écris en français avec le tutoiement. Registre : un ami bienveillant et lucide qui parle franchement, sans dramatiser. Pas un thérapeute qui prescrit, pas un coach qui sermonne. Christophe André : ton posé, accessible, chaque phrase utile.
- Pas de jargon. Pas d'abstractions sans ancrage immédiat.
- Chaque phrase doit avoir un contenu réel. Si elle ne dit rien de spécifique, supprime-la.
- Langage incitatif : "tu pourrais," "ça peut aider de," "essaie de." Jamais "il est temps de," "tu dois."
- Pas de remplissage de développement personnel.
- Pas d'inflation émotionnelle. Pas d'anxiété vendue.
- Prose naturelle et variée. Pas de modèles.

[WORKFLOW]
Source : Lis le contenu complet de "主题四_系统优化" y compris _method et _thought.

Pour "针对性优化", rends chaque scène en deux étapes :
Étape 1 — Décris en 1–2 phrases l'état problématique du champ "状态" en langage courant, pour que le lecteur se reconnaisse dans sa situation réelle.
Étape 2 — Rends le contenu des champs "分析" et "针对性建议" sous forme de conseils concrets et actionnables.
N'utilise jamais les noms de champs "状态," "干预策略," ou "偏强/偏弱" dans la sortie. Convertis le format tableau en objet clé-valeur.

Chaque scène de 针对性优化 suit naturellement le Thème 3 — sans référence explicite.

Avertissement critique : Si "针对性优化" dans le brouillon est un tableau vide, produis {} — ne fabrique jamais de suggestions.

Longueur :
- 核心矛盾 : 3–4 phrases. Constat factuel et direct — tranchant, précis, sans solution encore proposée.
- 人生自洽建议 : 200–300 mots. Stratifié et spécifique. Des propos vrais, pas des platitudes.
- Chaque scène 针对性优化 : 100–150 mots.

Règle de valeur vide globale : Garde toutes les clés prédéfinies. Ne les supprime jamais.

[FORMAT DE SORTIE]
{"主题四_优化": {"核心矛盾": "...", "人生自洽建议": "...", "针对性优化": {"<clé scène A>": "...", "<clé scène B>": "..."}}}`;

function getPrompt(locale: string): string {
  if (locale === "en") return PROMPT_EN;
  if (locale === "fr") return PROMPT_FR;
  return PROMPT_ZH;
}

async function callGemini(prompt: string, userMessage: string, apiKey: string): Promise<string> {
  const delays = [10000, 20000, 30000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: prompt }] },
            contents: [{ role: "user", parts: [{ text: userMessage }] }],
            generationConfig: { temperature: 1.0 },
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
        throw new Error("Gemini returned empty content");
      }
      const errText = await response.text();
      if ((response.status === 503 || response.status === 429) && attempt < delays.length) {
        await new Promise(r => setTimeout(r, delays[attempt]));
        continue;
      }
      throw new Error(`Gemini API error ${response.status}: ${errText}`);
    } catch (e) {
      if (attempt < delays.length) {
        await new Promise(r => setTimeout(r, delays[attempt]));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Gemini max retries exceeded");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });

  let readingId: string;
  let locale: string;
  try {
    const body = await req.json();
    readingId = body.readingId;
    locale = body.locale ?? "zh";
    if (!readingId) throw new Error("Missing readingId");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  EdgeRuntime.waitUntil((async () => {
    try {
      const { data: existing } = await supabase
        .from("bazi_readings")
        .select("ai_reading_draft, ai_reading_theme1, ai_reading_theme2, ai_reading_theme3, ai_reading_theme4")
        .eq("id", readingId).single();

      if (existing?.ai_reading_theme4) {
        await supabase.from("bazi_readings").update({ ai_reading_status: "done" }).eq("id", readingId);
        return;
      }

      if (!existing?.ai_reading_draft) throw new Error("Draft missing");
      if (!existing?.ai_reading_theme1) throw new Error("Theme 1 missing");
      if (!existing?.ai_reading_theme2) throw new Error("Theme 2 missing");
      if (!existing?.ai_reading_theme3) throw new Error("Theme 3 missing");

      const prompt = getPrompt(locale);
      const userMessage = `Full draft JSON:\n${JSON.stringify(existing.ai_reading_draft)}\n\nRendered Theme 1:\n${JSON.stringify(existing.ai_reading_theme1)}\n\nRendered Theme 2:\n${JSON.stringify(existing.ai_reading_theme2)}\n\nRendered Theme 3:\n${JSON.stringify(existing.ai_reading_theme3)}\n\nInstruction: Render Theme 4 only. Return JSON only.`;
      const text = await callGemini(prompt, userMessage, geminiApiKey);

      let cleanText = text.trim();
      const s = cleanText.indexOf("{"), e = cleanText.lastIndexOf("}");
      if (s !== -1 && e !== -1) cleanText = cleanText.substring(s, e + 1);
      let result = JSON.parse(cleanText);

      if (!result["主题四_优化"]) {
        const hasKeys = result["核心矛盾"] !== undefined || result["人生自洽建议"] !== undefined;
        if (hasKeys) result = { "主题四_优化": result };
        else throw new Error("Theme 4 output structure invalid");
      }
      const opt = result["主题四_优化"];
      if (!opt["核心矛盾"]) opt["核心矛盾"] = "";
      if (!opt["人生自洽建议"]) opt["人生自洽建议"] = "";
      if (!opt["针对性优化"]) opt["针对性优化"] = {};

      await supabase.from("bazi_readings").update({ ai_reading_theme4: result, ai_reading_status: "done" }).eq("id", readingId);
      console.log(`[${readingId}] Theme 4 done. Report complete.`);
    } catch (error) {
      console.error(`[${readingId}] Theme 4 failed:`, error);
      await supabase.from("bazi_readings").update({ ai_reading_status: "failed_theme4" }).eq("id", readingId);
    }
  })());

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
});