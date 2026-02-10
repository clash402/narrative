import type {
  Campaign,
  CampaignTemplate,
  DayOutline,
  DayOutlineVersion,
  DayPost,
  DayPostVersion,
} from "@prisma/client";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

type CampaignWithTemplate = Campaign & {
  template: CampaignTemplate;
};

type WorkspaceOutline = DayOutline & {
  keyPoints: unknown;
};

type WorkspacePost = DayPost & {
  altHooks: unknown;
};

function serializeCampaign(campaign: CampaignWithTemplate) {
  return {
    ...campaign,
    pillars: asStringArray(campaign.pillars),
    forbidden: asStringArray(campaign.forbidden),
  };
}

function serializeOutline(outline: WorkspaceOutline) {
  return {
    ...outline,
    keyPoints: asStringArray(outline.keyPoints),
  };
}

function serializePost(post: WorkspacePost) {
  return {
    ...post,
    altHooks: asStringArray(post.altHooks),
  };
}

function serializeOutlineVersion(version: DayOutlineVersion) {
  return {
    ...version,
    snapshot: version.snapshot as Record<string, unknown>,
  };
}

function serializePostVersion(version: DayPostVersion) {
  return {
    ...version,
    snapshot: version.snapshot as Record<string, unknown>,
  };
}

export {
  asStringArray,
  serializeCampaign,
  serializeOutline,
  serializeOutlineVersion,
  serializePost,
  serializePostVersion,
};
