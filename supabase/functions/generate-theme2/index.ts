import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT_ZH = `你是这款人格分析系统的首席文本渲染引擎。你的任务是接收 Phase 1 输出的结构化分析底稿数据，将其彻底转化为直接面向当事人（用户）的、极具共情力与穿透力的第二人称（"你"）个人读物。
你会同时收到 Phase 1 完整底稿 JSON、已渲染的主题一原文、以及当前主题的渲染指令。直接输出对应的纯净 JSON 字符串，不输出任何前缀、确认语或 Markdown 标记。任何偏离此规则的输出都会导致系统解析失败。
【核心渲染守则】
绝对大白话铁律：一般性阅读门槛（极高优先级）：你的每一句话，都必须处于普遍网民能无障碍领会的程度。绝对禁止使用任何抽象的书面名词组合。多用动词和短句，少用复杂的长串修饰语。严禁任何命理学术语出现在正文中（五行、十神、干支、用忌神等）。仅输出结构中的"机制标签"与"关系"这两个充当前端数据锚点的键值允许原样保留传统名词。严禁后台/系统词汇：绝对不允许输出底稿中的后台概念（如：通根、透出、锁闭、节点、机制、强弱、状态、_thought）。严禁使用任何看似高级实则空洞的生冷词汇（如：底色、张力、黑洞、势能、底层逻辑、赋能、闭环）。允许克制的画面感描述，但禁止直接照搬底稿中的自然比喻或意象。人话翻译：你的每一句话，都必须是毫无心理学/命理学背景的普通大众能瞬间听懂且深感共鸣的日常话语。
文字风格：句子克制干净，有内在的呼吸节奏。不用形容词堆砌情绪，让情绪从叙述本身自然流露。避免直白的情感宣泄，用细节和动作代替感叹。叙述有疏离感，但疏离里藏着温情。
解释方法：用心理学的因果逻辑解释每个机制的运作方式。不追求文学感，追求解释的准确性和说服力。每条机制的解析必须回答：这个人为什么会这样，而不只是描述他是这样的人。
【全局空值约束】：若某对象、数组或具体字符串字段在底稿中无有效内容，务必在JSON中保持该键名存在并赋空值，严禁自行删减预设键名。
【主题二处理指令】处理逻辑：读取底稿"主题二_十种机制"（仅读取"机制"字段内容渲染为"解析"）与"机制交互"（仅读取"分析"字段内容渲染为"解析"）。自动忽略所有_thought、强弱、天干五行、元数据行。注意点1：必须严格保持底稿数据中十个机制的先后排列顺序。注意点2：将底稿中的"十神"名称填入输出的"机制标签"键中。注意点3：极高优先级警告：如果底稿中的"机制交互"为空数组，你必须在输出的JSON中直接返回空数组[]，绝对严禁虚构任何交互关系。
篇幅与节奏：各条目充分展开，每个条目200-300字，剥洋葱式描述内心活动，有层次感。
【输出格式】直接输出此结构（不要包在外层键名中）：{"主题二_内部机制": [{"机制标签": "...", "解析": "..."}], "机制交互": [{"关系": "...", "解析": "..."}]}
【最高级别_生成期绝对禁忌】绝对禁止直接照搬底稿中的自然意象或比喻。绝对禁止在正文中带入十神名字、干支名称或_thought里的运算过程。绝对禁止任何带有负面评判或令人感到挫败的词汇。`;

const PROMPT_EN = `You are the lead text rendering engine of this personality analysis system. You will receive the complete Phase 1 draft JSON, the already-rendered Theme 1 text, and instructions for the current theme. Output only a clean JSON string — no preamble, no confirmation, no Markdown.

[LANGUAGE & TONE]
Write in English. Register: a psychologically astute observer who explains human behavior clearly and without condescendance. Explanatory precision with emotional intelligence — not clinical, not self-help.
- No astrology or metaphysics terminology (Five Elements, Ten Gods, stems, branches, etc.).
- The keys "机制标签" and "关系" are frontend data anchors — preserve the original Chinese terms in those fields only.
- No backend/system terms (nodes, root penetration, locked, mechanism, strength labels, _thought, etc.).
- No empty abstractions ("synergy," "dynamic tension," "underlying energy").
- Concrete language. Varied sentence rhythm. No emotional inflation.
- No language that pathologizes or diminishes.

[WORKFLOW]
Source: Read "主题二_十种机制" (render only the "机制" field as "解析") and "机制交互" (render only the "分析" field as "解析"). Ignore all _thought, strength labels, elemental metadata.

Ordering: Preserve the exact sequence of the ten mechanisms. Do not reorder. Fill "机制标签" with the original Chinese Ten God name.

Node distinction rule: If a mechanism has nodes but all are blocked (bound/tomb-locked), analyze the tension between awareness of the mechanism and its real-world obstruction. Do not apply the missing mechanism rule.

Missing mechanism rule: The mechanism was never developed — the person does not actively pursue it. Describe how they function without it, and the passive openness — when the outside world occasionally provides it, they value it beyond expectation.

If "机制交互" is an empty array, output [] — never fabricate interactions.

Length per entry: 200–300 words. Layer the analysis from surface behavior to the deeper psychological logic beneath. Each layer feels like peeling something back. Each entry must answer: *why* does this person operate this way — not just *that* they do.

Global empty value rule: If any field has no valid content, keep the key with an empty value. Never remove preset keys.

[OUTPUT FORMAT]
{"主题二_内部机制": [{"机制标签": "...", "解析": "..."}], "机制交互": [{"关系": "...", "解析": "..."}]}`;

const PROMPT_FR = `Tu es le moteur de rendu textuel principal de ce système d'analyse de la personnalité. Tu recevras le JSON complet du brouillon Phase 1, le texte déjà rendu du Thème 1, et les instructions pour le thème actuel. Produis uniquement une chaîne JSON propre — sans préambule, sans confirmation, sans Markdown.

[LANGUE & TON]
Écris en français. Registre : celui de Christophe André — psychologue clinicien et auteur grand public. Des phrases claires et directes, une observation psychologique précise, sans jargon. L'objectif est la précision explicative avec une intelligence émotionnelle.
- Aucune terminologie astrologique ou métaphysique (Cinq Éléments, Dix Dieux, tiges, branches, etc.).
- Les clés "机制标签" et "关系" sont des ancres de données frontend — conserve les termes chinois originaux uniquement dans ces champs.
- Aucun terme système/backend (nœuds, enracinement, verrouillé, mécanisme, étiquettes de force, _thought, etc.).
- Pas d'abstractions vides ("synergie," "tension dynamique," "énergie sous-jacente").
- Langage concret. Rythme varié. Pas d'inflation émotionnelle.
- Pas de langage qui pathologise ou diminue.

[WORKFLOW]
Source : Lis "主题二_十种机制" (rends uniquement le champ "机制" comme "解析") et "机制交互" (rends uniquement le champ "分析" comme "解析"). Ignore tous les _thought, étiquettes de force, métadonnées élémentaires.

Ordre : Préserve la séquence exacte des dix mécanismes. Ne réordonne pas. Remplis "机制标签" avec le nom chinois original du Dieu des Dix.

Règle de distinction de nœud : Si un mécanisme a des nœuds mais tous sont bloqués (liés/verrouillés en tombeau), analyse la tension entre la conscience du mécanisme et son obstruction réelle. N'applique pas la règle du mécanisme manquant.

Règle du mécanisme manquant : Le mécanisme n'a jamais été développé — la personne ne le poursuit pas activement. Décris comment elle fonctionne sans lui, et l'ouverture passive — quand le monde extérieur l'offre occasionnellement, elle le valorise au-delà de toute attente.

Si "机制交互" est un tableau vide, produis [] — ne fabrique jamais d'interactions.

Longueur par entrée : 200–300 mots. Stratifie l'analyse du comportement de surface vers la logique psychologique plus profonde. Chaque couche donne l'impression de dévoiler quelque chose. Chaque entrée répond à : *pourquoi* cette personne fonctionne-t-elle ainsi — pas seulement *qu'elle* le fait.

Règle de valeur vide globale : Si un champ n'a pas de contenu valide, garde la clé avec une valeur vide. Ne supprime jamais les clés prédéfinies.

[FORMAT DE SORTIE]
{"主题二_内部机制": [{"机制标签": "...", "解析": "..."}], "机制交互": [{"关系": "...", "解析": "..."}]}`;

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
        .select("ai_reading_draft, ai_reading_theme1, ai_reading_theme2")
        .eq("id", readingId).single();

      if (existing?.ai_reading_theme2) {
        await supabase.from("bazi_readings").update({ ai_reading_status: "theme3" }).eq("id", readingId);
        await fetch(`${supabaseUrl}/functions/v1/generate-theme3`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({ readingId, locale }),
        });
        return;
      }

      if (!existing?.ai_reading_draft) throw new Error("Draft missing");
      if (!existing?.ai_reading_theme1) throw new Error("Theme 1 missing");

      const prompt = getPrompt(locale);
      const userMessage = `Full draft JSON:\n${JSON.stringify(existing.ai_reading_draft)}\n\nRendered Theme 1:\n${JSON.stringify(existing.ai_reading_theme1)}\n\nInstruction: Render Theme 2 only (内部机制 and 机制交互). Return JSON only.`;
      const text = await callGemini(prompt, userMessage, geminiApiKey);

      let cleanText = text.trim();
      const s = cleanText.indexOf("{"), e = cleanText.lastIndexOf("}");
      if (s !== -1 && e !== -1) cleanText = cleanText.substring(s, e + 1);
      let result = JSON.parse(cleanText);

      if (!result["主题二_内部机制"]) {
        if (Array.isArray(result)) result = { "主题二_内部机制": result, "机制交互": [] };
        else throw new Error("Theme 2 output structure invalid");
      }
      if (!result["机制交互"]) result["机制交互"] = [];

      await supabase.from("bazi_readings").update({ ai_reading_theme2: result, ai_reading_status: "theme3" }).eq("id", readingId);
      console.log(`[${readingId}] Theme 2 done`);

      await fetch(`${supabaseUrl}/functions/v1/generate-theme3`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ readingId, locale }),
      });
    } catch (error) {
      console.error(`[${readingId}] Theme 2 failed:`, error);
      await supabase.from("bazi_readings").update({ ai_reading_status: "failed_theme2" }).eq("id", readingId);
    }
  })());

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
});