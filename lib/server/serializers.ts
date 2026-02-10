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
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    template: {
      ...campaign.template,
      createdAt: campaign.template.createdAt.toISOString(),
      updatedAt: campaign.template.updatedAt.toISOString(),
      formatRotation: asStringArray(campaign.template.formatRotation),
    },
  };
}

function serializeOutline(outline: WorkspaceOutline) {
  return {
    ...outline,
    keyPoints: asStringArray(outline.keyPoints),
    createdAt: outline.createdAt.toISOString(),
    updatedAt: outline.updatedAt.toISOString(),
  };
}

function serializePost(post: WorkspacePost) {
  return {
    ...post,
    altHooks: asStringArray(post.altHooks),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

function serializeOutlineVersion(version: DayOutlineVersion) {
  return {
    ...version,
    snapshot: version.snapshot as Record<string, unknown>,
    createdAt: version.createdAt.toISOString(),
  };
}

function serializePostVersion(version: DayPostVersion) {
  return {
    ...version,
    snapshot: version.snapshot as Record<string, unknown>,
    createdAt: version.createdAt.toISOString(),
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
