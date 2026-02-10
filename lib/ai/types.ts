import type { CampaignTemplate } from "@prisma/client";

export type TaskType =
  | "OUTLINE_ALL"
  | "OUTLINE_ACT"
  | "OUTLINE_DAY"
  | "POST_DAY"
  | "POST_ALL";

export type CampaignBible = {
  voiceStyle: string;
  audience: string;
  goal: string;
  pillars: string[];
  forbidden: string[];
  ctaPreference: string | null;
};

export type OutlineDayInput = {
  dayNumber: number;
  actNumber: number;
  title: string;
  hook: string;
  format: string;
  keyPoints: string[];
  cta: string;
  constraints?: string | null;
};

export type PostDayInput = {
  dayNumber: number;
  text: string;
  altHooks: string[];
};

export type OutlineTaskContext = {
  campaignId: string;
  campaignName: string;
  theme: string;
  bible: CampaignBible;
  template: Pick<
    CampaignTemplate,
    "name" | "act1Intent" | "act2Intent" | "act3Intent" | "formatRotation"
  >;
  dayOutlines: OutlineDayInput[];
  targetAct?: number;
  targetDay?: number;
};

export type PostTaskContext = {
  campaignId: string;
  campaignName: string;
  theme: string;
  bible: CampaignBible;
  dayOutlines: OutlineDayInput[];
  targetDay?: number;
};

export type TaskContext = OutlineTaskContext | PostTaskContext;

export type GenerateTextInput = {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
};

export interface AIProvider {
  readonly name: "openai" | "anthropic" | "google";
  generateText(input: GenerateTextInput): Promise<string>;
  getModelConfig(): {
    small: string;
    large: string;
  };
}

export type RunTaskResult<T> = {
  data: T;
  meta: {
    provider: string;
    model: string;
    retries: number;
    escalated: boolean;
  };
};
