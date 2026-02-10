import { z } from "zod";

import {
  outlineResponseSchema,
  postAllResponseSchema,
  postDayResponseSchema,
} from "@/lib/ai/schemas";
import type { TaskContext, TaskType } from "@/lib/ai/types";

type ValidationSuccess<T> = {
  ok: true;
  data: T;
};

type ValidationFailure = {
  ok: false;
  errors: string[];
};

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

function extractJsonObject(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const blockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (blockMatch?.[1]) {
    return blockMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("No JSON object found in model output.");
}

function parseJson(raw: string): unknown {
  const json = extractJsonObject(raw);
  return JSON.parse(json);
}

function toErrorList(error: z.ZodError): string[] {
  return error.issues.map(
    (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`,
  );
}

function stopWordsFiltered(input: string): string[] {
  const stopWords = new Set([
    "the",
    "and",
    "that",
    "with",
    "from",
    "this",
    "into",
    "your",
    "have",
    "will",
    "about",
    "their",
  ]);

  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !stopWords.has(token));
}

function validateOutlineRules(
  taskType: TaskType,
  payload: z.infer<typeof outlineResponseSchema>,
  context: TaskContext,
): string[] {
  const errors: string[] = [];
  const days = payload.days;

  const expectedCount =
    taskType === "OUTLINE_ALL" ? 30 : taskType === "OUTLINE_ACT" ? 10 : 1;
  if (days.length !== expectedCount) {
    errors.push(`Expected ${expectedCount} days, got ${days.length}.`);
  }

  const uniqueDayNumbers = new Set(days.map((day) => day.dayNumber));
  if (uniqueDayNumbers.size !== days.length) {
    errors.push("Day numbers must be unique.");
  }

  const hookCounts = new Map<string, number>();
  for (const day of days) {
    const key = day.hook.trim().toLowerCase();
    hookCounts.set(key, (hookCounts.get(key) ?? 0) + 1);
  }

  const duplicateHookEntries = [...hookCounts.entries()].filter(
    ([, count]) => count > 2,
  );
  if (duplicateHookEntries.length > 0) {
    errors.push("Hooks are duplicated too often.");
  }

  if (taskType === "OUTLINE_ALL") {
    const actCounts = [1, 2, 3].map(
      (act) => days.filter((day) => day.actNumber === act).length,
    );
    if (!actCounts.every((count) => count === 10)) {
      errors.push(
        `Each act must contain 10 days. Got counts: ${actCounts.join(", ")}.`,
      );
    }
  }

  if (taskType === "OUTLINE_ACT") {
    if (!("targetAct" in context) || !context.targetAct) {
      errors.push("Missing target act context.");
    } else {
      const start =
        context.targetAct === 1 ? 1 : context.targetAct === 2 ? 11 : 21;
      const end = start + 9;

      for (const day of days) {
        if (day.actNumber !== context.targetAct) {
          errors.push(
            `Day ${day.dayNumber} has act ${day.actNumber}, expected ${context.targetAct}.`,
          );
        }

        if (day.dayNumber < start || day.dayNumber > end) {
          errors.push(
            `Day ${day.dayNumber} outside expected range ${start}-${end}.`,
          );
        }
      }
    }
  }

  if (taskType === "OUTLINE_DAY") {
    if (!("targetDay" in context) || !context.targetDay) {
      errors.push("Missing target day context.");
    } else {
      const expectedDay = context.targetDay;
      const day = days[0];
      if (!day || day.dayNumber !== expectedDay) {
        errors.push(`Expected only day ${expectedDay}.`);
      }
    }
  }

  return errors;
}

function validatePostText(
  text: string,
  forbidden: string[],
  outline: { title: string; hook: string; keyPoints: string[]; cta: string },
): string[] {
  const errors: string[] = [];

  if (text.length > 2200) {
    errors.push("Post exceeds 2200 characters.");
  }

  if (/^#{1,6}\s/m.test(text)) {
    errors.push("Post contains markdown headings.");
  }

  for (const phrase of forbidden) {
    const token = phrase.trim();
    if (!token) {
      continue;
    }

    if (text.toLowerCase().includes(token.toLowerCase())) {
      errors.push(`Forbidden phrase used: ${token}`);
    }
  }

  const keywords = stopWordsFiltered(
    [outline.title, outline.hook, ...outline.keyPoints].join(" "),
  );
  const overlap = keywords.filter((token) =>
    text.toLowerCase().includes(token),
  );

  if (overlap.length < 2) {
    errors.push("Post appears misaligned with day outline intent.");
  }

  const ctaKeywords = stopWordsFiltered(outline.cta);
  const ctaOverlap = ctaKeywords.filter((token) =>
    text.toLowerCase().includes(token),
  );

  if (ctaKeywords.length > 0 && ctaOverlap.length === 0) {
    errors.push("Post does not reflect CTA intent.");
  }

  return errors;
}

function validateOutput(
  taskType: TaskType,
  rawOutput: string,
  context: TaskContext,
): ValidationResult<unknown> {
  let parsed: unknown;

  try {
    parsed = parseJson(rawOutput);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not parse JSON output.";
    return { ok: false, errors: [message] };
  }

  if (taskType.startsWith("OUTLINE")) {
    const result = outlineResponseSchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, errors: toErrorList(result.error) };
    }

    const ruleErrors = validateOutlineRules(taskType, result.data, context);
    if (ruleErrors.length > 0) {
      return { ok: false, errors: ruleErrors };
    }

    return { ok: true, data: result.data };
  }

  if (taskType === "POST_DAY") {
    const result = postDayResponseSchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, errors: toErrorList(result.error) };
    }

    if (!("targetDay" in context) || !context.targetDay) {
      return {
        ok: false,
        errors: ["Missing target day context for POST_DAY."],
      };
    }

    const outline = context.dayOutlines.find(
      (day) => day.dayNumber === context.targetDay,
    );
    if (!outline) {
      return { ok: false, errors: ["Outline not found for target day."] };
    }

    const postErrors = validatePostText(
      result.data.text,
      context.bible.forbidden,
      outline,
    );
    if (postErrors.length > 0) {
      return { ok: false, errors: postErrors };
    }

    return { ok: true, data: result.data };
  }

  const result = postAllResponseSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, errors: toErrorList(result.error) };
  }

  const daySet = new Set(result.data.posts.map((post) => post.dayNumber));
  if (daySet.size !== 30) {
    return {
      ok: false,
      errors: ["POST_ALL must return 30 unique day numbers."],
    };
  }

  const postErrors: string[] = [];
  for (const post of result.data.posts) {
    const outline = context.dayOutlines.find(
      (day) => day.dayNumber === post.dayNumber,
    );
    if (!outline) {
      postErrors.push(`Post day ${post.dayNumber} has no matching outline.`);
      continue;
    }

    const currentErrors = validatePostText(
      post.text,
      context.bible.forbidden,
      outline,
    );
    if (currentErrors.length > 0) {
      postErrors.push(`Day ${post.dayNumber}: ${currentErrors.join("; ")}`);
    }
  }

  if (postErrors.length > 0) {
    return { ok: false, errors: postErrors };
  }

  return { ok: true, data: result.data };
}

export { validateOutput };
