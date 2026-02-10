import type { TaskContext, TaskType } from "@/lib/ai/types";

const jsonRequirement =
  "Return JSON only. No markdown fences, no explanations, no extra keys outside the schema.";

function normalizeFormatRotation(rotation: unknown): string[] {
  if (!Array.isArray(rotation)) {
    return [
      "story",
      "list",
      "myth-bust",
      "mini-case",
      "how-to",
      "contrarian take",
      "behind-the-scenes",
    ];
  }

  return rotation
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function campaignBibleBlock(context: TaskContext): string {
  return [
    `Campaign Name: ${context.campaignName}`,
    `Theme: ${context.theme}`,
    `Voice Style: ${context.bible.voiceStyle}`,
    `Audience: ${context.bible.audience}`,
    `Goal: ${context.bible.goal}`,
    `Pillars: ${context.bible.pillars.join(" | ")}`,
    `Forbidden: ${context.bible.forbidden.join(" | ")}`,
    `CTA Preference: ${context.bible.ctaPreference ?? "None specified"}`,
  ].join("\n");
}

function outlineTaskPrompt(taskType: TaskType, context: TaskContext): string {
  if (!("template" in context)) {
    throw new Error("Outline task requires template context.");
  }

  const formatRotation = normalizeFormatRotation(
    context.template.formatRotation,
  );

  const base = [
    "You are generating a LinkedIn campaign outline.",
    campaignBibleBlock(context),
    `Template: ${context.template.name}`,
    `Act 1 intent: ${context.template.act1Intent}`,
    `Act 2 intent: ${context.template.act2Intent}`,
    `Act 3 intent: ${context.template.act3Intent}`,
    `Format rotation suggestion: ${formatRotation.join(" | ")}`,
    "Each day must include title, hook, format, 3 keyPoints, and cta.",
    "Hooks must feel distinct across days.",
    jsonRequirement,
  ];

  if (taskType === "OUTLINE_ALL") {
    return [
      ...base,
      "Generate exactly 30 days. Each act must have exactly 10 days.",
      'Return schema: {"days":[{"dayNumber":1..30,"actNumber":1..3,"title":"","hook":"","format":"","keyPoints":["","",""],"cta":"","constraints":""}]}.',
    ].join("\n");
  }

  if (taskType === "OUTLINE_ACT") {
    if (!context.targetAct) {
      throw new Error("Act target missing.");
    }

    const start =
      context.targetAct === 1 ? 1 : context.targetAct === 2 ? 11 : 21;
    const end = start + 9;

    return [
      ...base,
      `Regenerate only Act ${context.targetAct}.`,
      `Generate exactly 10 days for dayNumber ${start}-${end}.`,
      `All days in output must have actNumber ${context.targetAct}.`,
      'Return schema: {"days":[{...10 entries...}]}.',
    ].join("\n");
  }

  if (taskType === "OUTLINE_DAY") {
    if (!context.targetDay) {
      throw new Error("Day target missing.");
    }

    const actNumber =
      context.targetDay <= 10 ? 1 : context.targetDay <= 20 ? 2 : 3;

    return [
      ...base,
      `Regenerate only day ${context.targetDay}.`,
      `The output must include exactly one day object with dayNumber ${context.targetDay} and actNumber ${actNumber}.`,
      'Return schema: {"days":[{...single entry...}]}.',
    ].join("\n");
  }

  throw new Error(`Unsupported outline task: ${taskType}`);
}

function postTaskPrompt(taskType: TaskType, context: TaskContext): string {
  if (!("dayOutlines" in context)) {
    throw new Error("Post task requires day outlines.");
  }

  const base = [
    "You are writing LinkedIn posts from a locked outline.",
    campaignBibleBlock(context),
    "Rules:" +
      "\n- Respect forbidden list exactly (if forbidden says no emojis, use no emojis)." +
      "\n- LinkedIn style, skimmable, no markdown headings." +
      "\n- Keep each post <= 2200 characters.",
    jsonRequirement,
  ];

  if (taskType === "POST_DAY") {
    const day = context.dayOutlines.find(
      (item) => item.dayNumber === context.targetDay,
    );
    if (!day) {
      throw new Error("Target day outline not found.");
    }

    return [
      ...base,
      `Target day: ${day.dayNumber}`,
      `Title: ${day.title}`,
      `Hook: ${day.hook}`,
      `Format: ${day.format}`,
      `Key points: ${day.keyPoints.join(" | ")}`,
      `CTA: ${day.cta}`,
      'Return schema: {"text":"","altHooks":["","",""]}.',
    ].join("\n");
  }

  if (taskType === "POST_ALL") {
    return [
      ...base,
      "Generate all 30 posts from these outlines:",
      JSON.stringify(
        context.dayOutlines.map((day) => ({
          dayNumber: day.dayNumber,
          actNumber: day.actNumber,
          title: day.title,
          hook: day.hook,
          format: day.format,
          keyPoints: day.keyPoints,
          cta: day.cta,
        })),
      ),
      'Return schema: {"posts":[{"dayNumber":1..30,"text":"","altHooks":["","",""]}]}.',
    ].join("\n");
  }

  throw new Error(`Unsupported post task: ${taskType}`);
}

function buildPrompt(taskType: TaskType, context: TaskContext): string {
  if (taskType.startsWith("OUTLINE")) {
    return outlineTaskPrompt(taskType, context);
  }

  return postTaskPrompt(taskType, context);
}

function buildFixPrompt(
  originalPrompt: string,
  validationErrors: string[],
): string {
  return [
    originalPrompt,
    "",
    "The previous response failed validation.",
    "Fix all issues and return valid JSON only.",
    `Validation errors: ${validationErrors.join(" | ")}`,
  ].join("\n");
}

export { buildFixPrompt, buildPrompt };
