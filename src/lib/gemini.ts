import { z } from "zod";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const analysisSchema = z.object({
  intent: z.string().nullable().optional(),
  clarity_score: z.number().min(0).max(100).nullable().optional(),
  ambiguities: z.array(z.string()).nullable().optional(),
  missing_constraints: z.array(z.string()).nullable().optional(),
  tone_detected: z.string().nullable().optional(),
  risk_issues: z.array(z.string()).nullable().optional(),
  token_estimate: z.number().nullable().optional(),
  complexity_level: z.string().nullable().optional(),
  improvement_strategy: z.array(z.string()).nullable().optional(),
  model_fit_score: z
    .object({
      chatgpt: z.number().min(0).max(100).nullable().optional(),
      gemini: z.number().min(0).max(100).nullable().optional(),
      image_model: z.number().min(0).max(100).nullable().optional(),
      code_model: z.number().min(0).max(100).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

export function getGeminiKey(): string {
  if (typeof window === "undefined") return "";
  const key = localStorage.getItem("pf_gemini_key");
  if (!key) throw new Error("NO_KEY");
  return key;
}

// Fast key validation — uses a minimal models list call with a 6s timeout.
// Does NOT use the retry backoff logic so it fails fast.
export async function validateGeminiKey(apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();

  // Quick format check before hitting the network
  if (!trimmed.startsWith("AIza") || trimmed.length < 30) {
    throw new Error("INVALID_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  let response: Response;
  try {
    response = await fetch(
      `${GEMINI_BASE}?key=${trimmed}`,
      { method: "GET", signal: controller.signal },
    );
  } catch {
    throw new Error("NETWORK_ERROR");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new Error("INVALID_KEY");
  }
  if (response.status === 429) {
    // Key is valid but rate-limited — treat as valid and proceed
    return;
  }
  if (!response.ok) {
    throw new Error("NETWORK_ERROR");
  }
  // 200 = valid key
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function callGemini(
  prompt: string,
  apiKey: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemInstruction?: string;
    responseMimeType?: string;
  },
  _retryCount = 0,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options?.temperature ?? 0.3,
      maxOutputTokens: options?.maxTokens ?? 1500,
    },
  };

  if (options?.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  if (options?.responseMimeType) {
    body.generationConfig.responseMimeType = options.responseMimeType;
  }

  const endpoint = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.status === 401) throw new Error("INVALID_KEY");

  // Rate limited — retry with exponential backoff (max 3 retries: 3s, 6s, 12s)
  if (response.status === 429) {
    if (_retryCount >= 3) throw new Error("RATE_LIMITED — wait 30 seconds and try again");
    const waitMs = Math.pow(2, _retryCount) * 3000; // 3s, 6s, 12s
    console.warn(`Rate limited, retrying in ${waitMs / 1000}s... (attempt ${_retryCount + 1}/3)`);
    await sleep(waitMs);
    return callGemini(prompt, apiKey, options, _retryCount + 1);
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`API error ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── COMPREHENSIVE HEURISTIC SCORER (12 dimensions, 100 points max) ────────
export function calculateHeuristicScore(prompt: string): number {
  if (!prompt || prompt.trim().length === 0) return 0;
  let score = 0;
  const lower = prompt.toLowerCase();
  const words = lower.split(/\s+/);
  const wordCount = words.length;

  // 1. ROLE/PERSONA DEFINITION (12 pts)
  const rolePatterns = ["you are", "act as", "your role", "as a", "you're a", "assume the role", "you will act", "persona:"];
  const roleHits = rolePatterns.filter(p => lower.includes(p)).length;
  score += Math.min(12, roleHits * 6);

  // 2. TASK CLARITY (10 pts)
  const taskPatterns = ["your task", "your goal", "your objective", "you must", "you should", "you will", "please", "generate", "create", "write", "analyze", "build", "implement", "design"];
  const taskHits = taskPatterns.filter(p => lower.includes(p)).length;
  score += Math.min(10, taskHits * 3);

  // 3. OUTPUT FORMAT SPECIFICATION (10 pts)
  const formatPatterns = ["format", "json", "markdown", "output as", "table", "csv", "html", "xml", "code block", "numbered list", "bullet", "structured", "template"];
  const formatHits = formatPatterns.filter(p => lower.includes(p)).length;
  score += Math.min(10, formatHits * 4);

  // 4. EXPLICIT CONSTRAINTS (10 pts)
  const constraintPatterns = ["don't", "do not", "must not", "never", "avoid", "must", "required", "mandatory", "always", "only", "exactly", "limit", "max", "min", "at least", "at most", "no more than"];
  const constraintHits = constraintPatterns.filter(p => lower.includes(p)).length;
  score += Math.min(10, constraintHits * 2);

  // 5. CONTEXT/BACKGROUND PROVIDED (8 pts)
  const contextPatterns = ["context:", "background:", "given that", "assuming", "the situation is", "you have access to", "the user", "the audience", "the goal is"];
  const contextHits = contextPatterns.filter(p => lower.includes(p)).length;
  score += Math.min(8, contextHits * 4);

  // 6. SPECIFICITY (word count optimal range) (8 pts)
  if (wordCount >= 30 && wordCount <= 100) score += 8;
  else if (wordCount >= 100 && wordCount <= 500) score += 8;
  else if (wordCount >= 15 && wordCount < 30) score += 4;
  else if (wordCount > 500) score += 6;
  else score += 1;

  // 7. EXAMPLES / FEW-SHOT (8 pts)
  const examplePatterns = ["example:", "for example", "e.g.", "such as", "like this:", "sample:", "here is an example", "for instance"];
  const exampleHits = examplePatterns.filter(p => lower.includes(p)).length;
  score += Math.min(8, exampleHits * 4);

  // 8. STRUCTURAL ELEMENTS (8 pts)
  const hasHeaders = /^#{1,3}\s/m.test(prompt);
  const hasBullets = /^[\-\*]\s/m.test(prompt);
  const hasNumbered = /^\d+[\.\)]\s/m.test(prompt);
  const hasSections = /\*\*[^*]+\*\*/m.test(prompt);
  score += (hasHeaders ? 2 : 0) + (hasBullets ? 2 : 0) + (hasNumbered ? 2 : 0) + (hasSections ? 2 : 0);

  // 9. NEGATIVE CONSTRAINTS / "DO NOT" LIST (8 pts)
  const negativePatterns = ["do not", "don't", "never", "avoid", "must not", "should not", "shouldn't", "refrain from"];
  const negativeHits = negativePatterns.filter(p => lower.includes(p)).length;
  score += Math.min(8, negativeHits * 3);

  // 10. QUALITY/TONE SPECIFICATION (6 pts)
  const tonePatterns = ["tone", "style", "voice", "professional", "casual", "formal", "concise", "detailed", "thorough", "brief", "technical", "friendly", "authoritative"];
  const toneHits = tonePatterns.filter(p => lower.includes(p)).length;
  score += Math.min(6, toneHits * 3);

  // 11. LENGTH/SCOPE SPECIFICATION (6 pts)
  const scopePatterns = ["words", "sentences", "paragraphs", "pages", "characters", "tokens", "short", "long", "comprehensive", "brief", "concise"];
  const scopeHits = scopePatterns.filter(p => lower.includes(p)).length;
  score += Math.min(6, scopeHits * 3);

  // 12. ABSENCE OF VAGUENESS (6 pts penalty system)
  const vagueWords = ["good", "nice", "something", "stuff", "things", "interesting", "cool", "great", "awesome", "better", "maybe", "kind of", "sort of", "pretty much"];
  const vagueHits = vagueWords.filter(w => lower.includes(` ${w} `) || lower.includes(` ${w}.`) || lower.includes(` ${w},`)).length;
  score += Math.max(0, 6 - vagueHits * 2);

  return Math.min(100, score);
}

export type PromptConfig = {
  targetModel: string;
  goalType: string;
  outputFormat: string;
  depthMode: string;
};

// ─── PHASE 1: ELITE DIAGNOSTIC ANALYSIS ─────────────────────────────────────

export async function runPhase1Analysis(
  rawPrompt: string,
  config: PromptConfig,
  apiKey: string,
): Promise<{
  analysis: AnalysisResult;
  fallbackUsed: boolean;
  heuristicScore: number;
}> {
  const systemInstruction = `You are a world-class AI prompt diagnostician with deep expertise in prompt engineering, cognitive science, and large language model behavior.

Your task is to rigorously analyze a user's raw prompt and extract a precise, data-driven diagnostic JSON. Think step-by-step before giving your final answer.

**Analysis Framework (apply ALL of these lenses):**

1. **INTENT CLARITY**: What is the user ACTUALLY trying to achieve? Identify the primary goal and any secondary goals.
2. **STRUCTURAL DECOMPOSITION**: Does the prompt have: a) a role/persona, b) clear task, c) context, d) constraints, e) output format? Note every missing element.
3. **AMBIGUITY MAPPING**: List every word, phrase or assumption that could be interpreted in 2+ different ways by the model.
4. **CONSTRAINT AUDIT**: What is MISSING — scope limits, length requirements, formatting rules, tone constraints, exclusions?
5. **MODEL-SPECIFIC FIT**: Score how well THIS prompt suits each major model based on their known strengths and sensitivities. Consider: GPT models prefer clear instructions; Gemini models prefer structured context-setting; Claude prefers explicit reasoning frameworks; image models require visual vocabulary; code models need specification-first clarity.
6. **RISK ANALYSIS**: What failure modes exist? What could the model misinterpret or hallucinate? What edge cases are unaddressed?
7. **TOKEN EFFICIENCY**: Is there redundancy? Are there vague words that waste context window?
8. **IMPROVEMENT STRATEGY**: List exactly 3-5 concrete, actionable improvement steps ordered by impact.

Return a JSON object matching this EXACT schema. Be precise and data-driven. Never guess — if a field cannot be confidently determined, return null.

Schema:
{
  "intent": string | null,
  "clarity_score": number,
  "ambiguities": string[],
  "missing_constraints": string[],
  "tone_detected": string | null,
  "risk_issues": string[],
  "token_estimate": number | null,
  "complexity_level": string | null,
  "improvement_strategy": string[],
  "model_fit_score": {
    "chatgpt": number | null,
    "gemini": number | null,
    "image_model": number | null,
    "code_model": number | null
  }
}`;

  const promptText = `**Prompt to Diagnose:**
\`\`\`
${rawPrompt}
\`\`\`

**User's Declared Intent Context:**
- Target model they plan to use: ${config.targetModel}
- Goal type / domain: ${config.goalType}
- Desired output format: ${config.outputFormat}
- Level of depth requested: ${config.depthMode}

Perform a thorough diagnostic analysis following all 8 lenses in your framework. Output ONLY the JSON object.`;

  let analysis: AnalysisResult | null = null;
  let fallbackUsed = false;
  const heuristicScore = calculateHeuristicScore(rawPrompt);

  try {
    const result = await callGemini(promptText, apiKey, {
      systemInstruction,
      temperature: 0.1,
      maxTokens: 4096,
      responseMimeType: "application/json",
    });

    try {
      let cleanedResult = result.trim();
      if (cleanedResult.startsWith("```json")) {
        cleanedResult = cleanedResult.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleanedResult.startsWith("```")) {
        cleanedResult = cleanedResult.replace(/^```/, "").replace(/```$/, "").trim();
      }

      const parsed = JSON.parse(cleanedResult);
      analysis = analysisSchema.parse(parsed);
    } catch (e) {
      console.warn("Failed to parse or validate Gemini Analysis JSON, falling back.", e);
      fallbackUsed = true;
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err.message === "INVALID_KEY" || err.message === "RATE_LIMITED") {
      throw err;
    }
    console.error("Gemini call failed entirely in Phase 1:", err);
    fallbackUsed = true;
  }

  if (fallbackUsed || !analysis) {
    analysis = {
      intent: "Could not be determined automatically.",
      clarity_score: heuristicScore,
      ambiguities: ["Unable to run deep analysis"],
      missing_constraints: ["Consider adding more specific instructions"],
      tone_detected: "neutral",
      risk_issues: [],
      token_estimate: Math.ceil(rawPrompt.length / 4),
      complexity_level: "moderate",
      improvement_strategy: [
        "Apply basic heuristic improvements",
        "Add role definition",
        "Specify output format",
      ],
      model_fit_score: {
        chatgpt: heuristicScore,
        gemini: heuristicScore,
        image_model: Math.max(0, heuristicScore - 20),
        code_model: Math.max(0, heuristicScore - 20),
      },
    };
  } else {
    const geminiScore = analysis.clarity_score ?? 50;
    analysis.clarity_score = Math.round(geminiScore * 0.7 + heuristicScore * 0.3);
  }

  return { analysis, fallbackUsed, heuristicScore };
}

// ─── PHASE 2: ELITE PROMPT OPTIMIZATION ──────────────────────────────────────

// Model-specific optimization tactics injected into the system prompt per target model
const MODEL_TACTICS: Record<string, string> = {
  "ChatGPT": `
**ChatGPT-specific optimization tactics to apply:**
- Open with "You are a [highly specific expert role]" — GPT responds strongly to precisely defined expert personas.
- Structure ALL instructions as explicit numbered steps or bullet points — GPT follows sequential instructions with high fidelity.
- For complex reasoning, add "Let's think step by step" or "Work through this methodically before answering."
- Add a dedicated "## Output Requirements" section with explicit formatting rules — GPT adheres strictly to stated structure.
- Include a negative-constraint section (what NOT to do) — GPT responds strongly to explicit exclusions.
- For complex tasks, consider embedding a one-shot example to anchor quality expectations.`,

  "Gemini": `
**Gemini-specific optimization tactics to apply:**
- Open with rich contextual background before the task — Gemini excels when given comprehensive context upfront.
- Use Markdown headers to section the prompt — Gemini follows sectioned, hierarchical structure extremely well.
- State the reasoning framework explicitly: "Analyze this from first principles", "Consider all trade-offs".
- For technical tasks, provide the end-goal AND the constraints simultaneously in the same section.
- Use "comprehensive", "thorough", and "in depth" phrasing — Gemini expands richly on structured requests.
- Gemini benefits from multi-dimensional prompts: ask it to consider multiple perspectives or approaches.`,

  "Claude": `
**Claude-specific optimization tactics to apply:**
- Establish values and quality principles first: "Prioritize accuracy over brevity", "Be precise and honest about uncertainty."
- Use XML-style delimiter tags to clearly separate sections: <instructions>, <context>, <constraints>, <output_format>.
- Be explicit about the reasoning style: "Apply first-principles thinking", "Reason from evidence to conclusion."
- Include explicit quality guardrails: "If you are uncertain about any fact, say so clearly."
- Ask Claude to "think carefully before responding" or "reason step-by-step" — it excels at chain-of-thought.
- For creative or nuanced output, anchor with: "Here is an example of the quality and style I'm looking for:"`,

  "Image Model (Midjourney/DALL-E)": `
**Image model optimization tactics (Midjourney / DALL-E) to apply:**
- Structure as: [Subject] + [Artistic Style] + [Lighting] + [Perspective/Composition] + [Mood] + [Technical Parameters].
- Be hyper-specific about the subject: not "a person" but "a 35-year-old South Asian woman in a tailored navy suit, confident expression, looking directly at the camera."
- Specify artistic style explicitly: photorealistic, oil painting, digital concept art, watercolor, 3D render, anime...
- Specify lighting: golden hour, dramatic side lighting, studio softbox, neon glow, candlelight...
- Specify perspective: aerial view, close-up portrait, Dutch angle, symmetrical centered, bokeh background...
- For Midjourney, append technical parameters: --ar 16:9 --stylize 750 --v 6 --quality 2
- Add negative prompts: "Do NOT include: blurry, distorted, extra limbs, watermarks, text overlays."`,

  "Code Generator (Copilot/Cursor)": `
**Code generator optimization tactics (GitHub Copilot / Cursor / GPT-4 Code) to apply:**
- Lead with a technical specification BEFORE the code request: language, framework, version, platform target.
- List ALL functional requirements as numbered acceptance criteria: "The solution MUST...", "It SHOULD...", "It MUST NOT..."
- Specify error handling and edge cases explicitly: "Handle null inputs gracefully", "Throw a typed error for invalid state."
- Specify code style: "Use TypeScript strict mode", "Follow SOLID principles", "Use functional programming patterns."
- Request test coverage explicitly: "Include Jest unit tests for each acceptance criterion."
- Specify performance constraints if applicable: time complexity bounds, memory limits, async/concurrency requirements.
- Request documentation: "Add JSDoc comments to all public functions and types."`,
};

export async function runPhase2Optimization(
  rawPrompt: string,
  analysis: AnalysisResult,
  config: PromptConfig,
  apiKey: string,
): Promise<string> {
  const modelTactics = MODEL_TACTICS[config.targetModel] ?? MODEL_TACTICS["ChatGPT"];

  const depthInstructions: Record<string, string> = {
    "Basic": "The result should be clean, noticeably better than the original, and easy to understand. Focus on the 2-3 highest-impact improvements. Keep it concise.",
    "Structured": "Every key dimension MUST be present: a clear role/persona, explicit context, the precise task, hard constraints, and an exact output format specification. Use ## Markdown headers to section the prompt.",
    "Expert": "Produce an expert-grade prompt with deep constraint lattices, explicit reasoning frameworks, multi-condition edge-case handling, and airtight output specifications. Spare no detail. This prompt should be production-ready for a professional AI deployment.",
    "Hard Constraint": "Use imperative language throughout. Produce a rigid, unambiguous, constraint-heavy prompt. Include a numbered RULES section and an explicit DO NOT list. Every instruction must be binary — either followed or not. Leave zero room for interpretation.",
  };
  const depthGuide = depthInstructions[config.depthMode] ?? depthInstructions["Structured"];

  const systemInstruction = `You are the world's foremost expert in AI prompt engineering, with a decade of experience building production-grade prompts for Fortune 500 AI systems, research labs, and top consumer AI products.

Your mission: Transform the user's raw, weak prompt into an absolute masterpiece of precision prompt engineering. The output prompt MUST elicit dramatically higher-quality, more accurate, and more reliable responses from the target AI model than the original ever could.

**Your 8-Step Elite Optimization Process — Execute ALL steps internally before writing output:**

STEP 1 — DIAGNOSTIC IMMERSION: Study the Phase 1 diagnostic deeply. Internalize every identified weakness, ambiguity, missing constraint, and risk issue. These are your targets.

STEP 2 — PERSONA ARCHITECTURE: Design the ideal expert persona. Be hyper-specific. Not "an expert developer" but "a Staff Software Engineer at Google with 12 years of experience building distributed backend systems in TypeScript and Go."

STEP 3 — CONTEXT SCAFFOLDING: What implicit background knowledge must the AI model have to produce a truly excellent response? Add it explicitly. Assume nothing.

STEP 4 — CONSTRAINT LATTICE: Define every rule, boundary, and requirement. Both POSITIVE (must do) and NEGATIVE (must NOT do). Prioritize constraints by importance.

STEP 5 — OUTPUT SPECIFICATION: Define the expected output with surgical precision — every structural element, the ideal length window, required tone, formatting rules, and quality bar. If a high-quality example would calibrate the model effectively, provide one.

STEP 6 — MODEL TUNING: Apply every applicable model-specific optimization tactic for ${config.targetModel}. Different models have fundamentally different internal architectures and sensitivities — exploit these differences.

STEP 7 — SELF-CRITIQUE PASS: Before finalizing, read your draft prompt through the eyes of the AI model that will receive it. Ask: "Is there ANY part of this that could be misinterpreted, ignored, or lead to a lower-quality response?" Fix every weakness.

STEP 8 — FINAL POLISH: Ensure the prompt flows naturally, reads clearly, and will be aesthetically received well by the AI model.

${modelTactics}

**Depth Requirement for this optimization:** ${depthGuide}

**CRITICAL Output Rules — Violating these will make the output unusable:**
1. Output ONLY the final optimized prompt text. NO preamble, NO explanation, NO commentary.
2. DO NOT start with phrases like "Here is the optimized prompt:" — begin the prompt DIRECTLY.
3. DO NOT wrap the entire output in triple backtick code fences.
4. USE Markdown formatting WITHIN the prompt body (## headers, **bold**, bullet lists) as structural elements — this is intentional and correct.
5. The target AI model is: **${config.targetModel}**. Every stylistic and structural choice must serve this specific model.`;

  const promptText = `═══════════════════════════════════════════════
OPTIMIZATION BRIEF
═══════════════════════════════════════════════

Target AI Model:       ${config.targetModel}
Use Case / Domain:     ${config.goalType}
Required Output:       ${config.outputFormat}
Depth Level:           ${config.depthMode}

═══════════════════════════════════════════════
PHASE 1 DIAGNOSTIC DATA
(Use every insight here to guide your optimization decisions)
═══════════════════════════════════════════════

${JSON.stringify(analysis, null, 2)}

═══════════════════════════════════════════════
ORIGINAL USER PROMPT
═══════════════════════════════════════════════

"""
${rawPrompt}
"""

═══════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════

Execute your full 8-step Elite Optimization Process internally. Then output the single, final, masterpiece-quality optimized prompt below. It must be dramatically better than the original in every dimension: specificity, structure, constraint coverage, model-alignment, and output format precision.`;

  return await callGemini(promptText, apiKey, {
    systemInstruction,
    temperature: 0.15,
    maxTokens: 8192,
  });
}

// ─── PHASE 3: SELF-REFINEMENT / CRITIC PASS ──────────────────────────────────

export async function runPhase3Refinement(
  rawPrompt: string,
  optimizedPrompt: string,
  config: PromptConfig,
  apiKey: string,
): Promise<string> {
  const systemInstruction = `You are a hyper-critical AI prompt reviewer and editor. You have reviewed over 10,000 prompts and have an extraordinary eye for detecting weaknesses that others miss.

Your job is to take an already-optimized prompt and make it EVEN BETTER through ruthless critique and surgical refinement.

**Your Review Checklist (apply every single check):**

1. **COMPLETENESS**: Does the prompt contain ALL necessary elements: role, context, task, constraints, output format, tone, length guidance? If ANY is missing or weak, add it.
2. **AMBIGUITY SCAN**: Read every sentence — is there ANY word or phrase that could be interpreted in 2+ ways? Rewrite it for zero ambiguity.
3. **CONSTRAINT TIGHTNESS**: Are all constraints specific and measurable? Convert vague constraints ("keep it short") into precise ones ("limit your response to 300 words").
4. **NEGATIVE CONSTRAINTS**: Are there clear "DO NOT" rules? If the prompt lacks explicit prohibitions, add the 3-5 most important ones for this task type.
5. **OUTPUT SPECIFICATION**: Is the output format described with enough detail that two different AI models would produce structurally identical responses? If not, tighten it.
6. **EDGE CASE HANDLING**: What could go wrong? Add handling instructions for the most likely failure mode.
7. **MODEL ALIGNMENT**: Is every structural choice optimized for ${config.targetModel}? Apply model-specific best practices.
8. **FLOW & READABILITY**: Does the prompt flow logically? Is it organized from most-important to least-important information?
9. **REDUNDANCY CUT**: Remove any repetitive or unnecessary content that wastes the context window without adding value.
10. **FINAL POLISH**: Ensure perfect grammar, consistent formatting, and professional quality.

**Critical Output Rules:**
- Output ONLY the refined prompt. NO commentary, NO explanation, NO preamble.
- Do NOT say "Here is the refined version" — start the refined prompt directly.
- Do NOT wrap the output in triple backticks.
- Preserve Markdown formatting within the prompt body (headers, bold, bullets).
- The refined prompt must be AT LEAST as long as the input prompt — do not over-compress. It is acceptable if it is longer.
- Every change you make must demonstrably improve prompt quality. Do not change things arbitrarily.`;

  const promptText = `═══════════════════════════════════════════════
REFINEMENT BRIEF
═══════════════════════════════════════════════

Target Model:    ${config.targetModel}
Domain:          ${config.goalType}
Output Format:   ${config.outputFormat}
Depth Level:     ${config.depthMode}

═══════════════════════════════════════════════
ORIGINAL USER PROMPT (for reference)
═══════════════════════════════════════════════

"""
${rawPrompt}
"""

═══════════════════════════════════════════════
CURRENT OPTIMIZED PROMPT (your input to refine)
═══════════════════════════════════════════════

"""
${optimizedPrompt}
"""

═══════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════

Apply your full 10-point review checklist to the optimized prompt above. Fix every weakness you find. Produce the final, publication-ready, maximum-quality prompt.`;

  return await callGemini(promptText, apiKey, {
    systemInstruction,
    temperature: 0.1,  // Even lower temp for refinement precision
    maxTokens: 8192,
  });
}
