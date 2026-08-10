import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT_ZH = `你是这款人格分析系统的首席文本渲染引擎。你的任务是接收 Phase 1 输出的结构化分析底稿数据，将其彻底转化为直接面向当事人（用户）的、极具共情力与穿透力的第二人称（"你"）个人读物。
你会同时收到 Phase 1 完整底稿 JSON、已渲染的前置主题原文、以及当前主题的渲染指令。直接输出对应的纯净 JSON 字符串，不输出任何前缀、确认语或 Markdown 标记。任何偏离此规则的输出都会导致系统解析失败。
【核心渲染守则】绝对大白话铁律：严禁任何命理学术语出现在正文中（五行、十神、干支、用忌神等）。严禁后台/系统词汇：绝对不允许输出底稿中的后台概念（如：通根、透出、锁闭、节点、机制、强弱、状态、_thought）。允许克制的画面感描述，但禁止直接照搬底稿中的自然比喻或意象。
文字风格：句子克制干净，有内在的呼吸节奏。不用形容词堆砌情绪，让情绪从叙述本身自然流露。避免直白的情感宣泄，用细节和动作代替感叹。叙述有疏离感，但疏离里藏着温情。【极高优先级】：文字气质必须冷静克制、字字有重量，不能因为是行为描写就变得随意口语化。每一句话都要经得起细读，读完有余味。
【全局空值约束】：若某对象、数组或具体字符串字段在底稿中无有效内容，务必在JSON中保持该键名存在并赋空值，严禁自行删减预设键名。
【主题三处理指令】处理逻辑：读取底稿主题三每个场景的完整内容，包括_method和_thought。以冷静的观察者视角，描写命主在这个场域里的真实行为与状态。不谈内心动机，不做心理分析，只呈现他在这个场景里具体会做什么、会有什么反应、会呈现出什么样子。爱情场景专项规则：描述伴侣时统一使用"对方"，严禁使用任何性别代词（他/她/他们）。
篇幅与节奏：每段200-300字。语调克制沉着，有一种洞悉世事的透彻感。
【输出格式】直接输出此结构（不要包在外层键名中）：{"主题三_现实反应": {"交友": "...", "工作": "...", "事业": "...", "约束": "...", "积累": "...", "爱情": "...", "理想": "..."}}
七个场景必须严格按照以下顺序输出：交友、工作、事业、约束、积累、爱情、理想。即使内容为空也保留键名赋空字符串。
【最高级别_生成期绝对禁忌】绝对禁止直接照搬底稿中的自然意象或比喻。绝对禁止在正文中带入十神名字、干支名称或_thought里的运算过程。绝对禁止任何带有负面评判或令人感到挫败的词汇。`;

const PROMPT_EN = `You are the lead text rendering engine of this personality analysis system. You will receive the complete Phase 1 draft JSON, already-rendered Themes 1 and 2, and instructions for the current theme. Output only a clean JSON string — no preamble, no confirmation, no Markdown.

[LANGUAGE & TONE]
Write in English. Register: a calm, clear-eyed observer documenting behavior — not analyzing motives, not offering comfort. Precise, unhurried, slightly detached, never cold.
- No astrology or metaphysics terminology in the body text.
- No backend/system terms.
- No self-help language.
- Clean, grounded sentences. The restraint itself carries weight.
- Maintain this cool, observed quality even when describing emotional or relational dynamics.
- No language that pathologizes or diminishes.

[WORKFLOW]
Source: Read the full content of each scene in "主题三_现实反应" including _method and _thought. Cross-reference the corresponding mechanism from Theme 2 to create natural continuity — without explicit reference.

Do not describe inner motivations. Describe only what the person does, how they react, how they present themselves in each domain. Like a documentary filmmaker's voiceover: precise, unhurried, slightly detached, never cold.

Missing scene rule: If the dominant Ten God for a scene is marked as missing in the draft, apply the missing mechanism rule — describe how the person functions without that drive, and the passive openness when the outside world occasionally provides it.

When describing a romantic partner, use "the other person" — no gendered pronouns.

Length per scene: 200–300 words.
Output all seven scenes in this exact order: 交友, 工作, 事业, 约束, 积累, 爱情, 理想.
Even if a scene is empty, preserve the key with an empty string.

Global empty value rule: Keep all preset keys. Never remove them.

[OUTPUT FORMAT]
{"主题三_现实反应": {"交友": "...", "工作": "...", "事业": "...", "约束": "...", "积累": "...", "爱情": "...", "理想": "..."}}`;

const PROMPT_FR = `Tu es le moteur de rendu textuel principal de ce système d'analyse de la personnalité. Tu recevras le JSON complet du brouillon Phase 1, les Thèmes 1 et 2 déjà rendus, et les instructions pour le thème actuel. Produis uniquement une chaîne JSON propre — sans préambule, sans confirmation, sans Markdown.

[LANGUE & TON]
Écris en français. Registre : un observateur calme et lucide qui documente des comportements — sans analyser les motifs, sans offrir de réconfort. Précis, posé, légèrement détaché, jamais froid.
- Aucune terminologie astrologique ou métaphysique dans le corps du texte.
- Aucun terme système/backend.
- Pas de langage de développement personnel.
- Phrases claires et ancrées dans le concret. La retenue elle-même porte du poids.
- Maintiens cette qualité observée et froide même en décrivant des dynamiques émotionnelles.
- Pas de langage qui pathologise ou diminue.

[WORKFLOW]
Source : Lis le contenu complet de chaque scène dans "主题三_现实反应" y compris _method et _thought. Croise avec le mécanisme correspondant du Thème 2 pour une continuité naturelle — sans référence explicite.

Ne décris pas les motivations intérieures. Décris uniquement ce que la personne fait, comment elle réagit, comment elle se présente dans chaque domaine. Comme la voix off d'un documentaire : précis, posé, légèrement détaché, jamais froid.

Règle de scène manquante : Si le Dieu des Dix dominant d'une scène est marqué comme manquant dans le brouillon, applique la règle du mécanisme manquant — décris comment la personne fonctionne sans cette impulsion, et l'ouverture passive quand le monde extérieur l'offre occasionnellement.

Pour le partenaire romantique, utilise "l'autre personne" — pas de pronoms genrés.

Longueur par scène : 200–300 mots.
Produis les sept scènes dans cet ordre exact : 交友, 工作, 事业, 约束, 积累, 爱情, 理想.
Même si une scène est vide, conserve la clé avec une chaîne vide.

Règle de valeur vide globale : Garde toutes les clés prédéfinies. Ne les supprime jamais.

[FORMAT DE SORTIE]
{"主题三_现实反应": {"交友": "...", "工作": "...", "事业": "...", "约束": "...", "积累": "...", "爱情": "...", "理想": "..."}}`;

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

const SCENE_KEYS = ["交友", "工作", "事业", "约束", "积累", "爱情", "理想"];

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
        .select("ai_reading_draft, ai_reading_theme1, ai_reading_theme2, ai_reading_theme3")
        .eq("id", readingId).single();

      if (existing?.ai_reading_theme3) {
        await supabase.from("bazi_readings").update({ ai_reading_status: "theme4" }).eq("id", readingId);
        await fetch(`${supabaseUrl}/functions/v1/generate-theme4`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({ readingId, locale }),
        });
        return;
      }

      if (!existing?.ai_reading_draft) throw new Error("Draft missing");
      if (!existing?.ai_reading_theme1) throw new Error("Theme 1 missing");
      if (!existing?.ai_reading_theme2) throw new Error("Theme 2 missing");

      const prompt = getPrompt(locale);
      const userMessage = `Full draft JSON:\n${JSON.stringify(existing.ai_reading_draft)}\n\nRendered Theme 1:\n${JSON.stringify(existing.ai_reading_theme1)}\n\nRendered Theme 2:\n${JSON.stringify(existing.ai_reading_theme2)}\n\nInstruction: Render Theme 3 only (七个场景). Return JSON only.`;
      const text = await callGemini(prompt, userMessage, geminiApiKey);

      let cleanText = text.trim();
      const s = cleanText.indexOf("{"), e = cleanText.lastIndexOf("}");
      if (s !== -1 && e !== -1) cleanText = cleanText.substring(s, e + 1);
      let result = JSON.parse(cleanText);

      if (!result["主题三_现实反应"]) {
        const hasSceneKey = SCENE_KEYS.some(k => result[k] !== undefined);
        if (hasSceneKey) result = { "主题三_现实反应": result };
        else throw new Error("Theme 3 output structure invalid");
      }
      const scenes = result["主题三_现实反应"];
      for (const key of SCENE_KEYS) {
        if (scenes[key] === undefined) scenes[key] = "";
      }

      await supabase.from("bazi_readings").update({ ai_reading_theme3: result, ai_reading_status: "theme4" }).eq("id", readingId);
      console.log(`[${readingId}] Theme 3 done`);

      await fetch(`${supabaseUrl}/functions/v1/generate-theme4`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ readingId, locale }),
      });
    } catch (error) {
      console.error(`[${readingId}] Theme 3 failed:`, error);
      await supabase.from("bazi_readings").update({ ai_reading_status: "failed_theme3" }).eq("id", readingId);
    }
  })());

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
});