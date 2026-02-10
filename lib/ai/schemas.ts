import { z } from "zod";

const outlineDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(30),
  actNumber: z.number().int().min(1).max(3),
  title: z.string().min(3),
  hook: z.string().min(3),
  format: z.string().min(2),
  keyPoints: z.array(z.string().min(2)).length(3),
  cta: z.string().min(3),
  constraints: z.string().optional().nullable(),
});

const outlineResponseSchema = z.object({
  days: z.array(outlineDaySchema),
});

const postDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(30),
  text: z.string().min(30).max(2200),
  altHooks: z.array(z.string().min(3)).max(3).optional().default([]),
});

const postDayResponseSchema = z.object({
  text: z.string().min(30).max(2200),
  altHooks: z.array(z.string().min(3)).max(3).optional().default([]),
});

const postAllResponseSchema = z.object({
  posts: z.array(postDaySchema).length(30),
});

export {
  outlineDaySchema,
  outlineResponseSchema,
  postAllResponseSchema,
  postDayResponseSchema,
  postDaySchema,
};
