import type { DayStatus } from "@prisma/client";

export type CampaignTemplateData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  act1Intent: string;
  act2Intent: string;
  act3Intent: string;
  formatRotation: string[];
};

export type CampaignData = {
  id: string;
  name: string;
  theme: string;
  templateId: string;
  template: CampaignTemplateData;
  voiceStyle: string;
  audience: string;
  goal: string;
  pillars: string[];
  forbidden: string[];
  ctaPreference: string | null;
  isOutlineLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DayOutlineData = {
  id: string;
  campaignId: string;
  dayNumber: number;
  actNumber: number;
  title: string;
  hook: string;
  format: string;
  keyPoints: string[];
  cta: string;
  constraints: string | null;
  status: DayStatus;
  versionNumber: number;
  createdAt: Date;
  updatedAt: Date;
};

export type DayPostData = {
  id: string;
  campaignId: string;
  dayNumber: number;
  text: string;
  altHooks: string[];
  status: DayStatus;
  versionNumber: number;
  createdAt: Date;
  updatedAt: Date;
};

export type DayOutlineVersionData = {
  id: string;
  campaignId: string;
  dayOutlineId: string;
  versionNumber: number;
  source: string;
  snapshot: Record<string, unknown>;
  createdAt: Date;
};

export type DayPostVersionData = {
  id: string;
  campaignId: string;
  dayPostId: string;
  versionNumber: number;
  source: string;
  snapshot: Record<string, unknown>;
  createdAt: Date;
};

export type WorkspaceData = {
  campaign: CampaignData;
  outlines: DayOutlineData[];
  posts: DayPostData[];
  outlineVersions: DayOutlineVersionData[];
  postVersions: DayPostVersionData[];
};
