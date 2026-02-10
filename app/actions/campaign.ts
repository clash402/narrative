"use server";

import { DayStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runTask } from "@/lib/ai/router";
import type {
  CampaignBible,
  OutlineDayInput,
  PostDayInput,
} from "@/lib/ai/types";
import {
  createOutlineSkeleton,
  normalizeStringList,
} from "@/lib/server/campaign";
import { db } from "@/lib/server/db";
import {
  createOutlineVersion,
  createPostVersion,
} from "@/lib/server/versioning";

const createCampaignSchema = z.object({
  name: z.string().min(3),
  theme: z.string().min(3),
  templateId: z.string().min(1),
  voiceStyle: z.string().min(3),
  audience: z.string().min(3),
  goal: z.string().min(3),
  pillars: z.string().min(3),
  forbidden: z.string().min(3),
  ctaPreference: z.string().optional(),
});

const saveOutlineEditsSchema = z.object({
  dayOutlineId: z.string().min(1),
  title: z.string().min(3),
  hook: z.string().min(3),
  format: z.string().min(2),
  keyPoints: z.array(z.string().min(1)).length(3),
  cta: z.string().min(3),
  constraints: z.string().optional(),
});

const savePostEditsSchema = z.object({
  campaignId: z.string().min(1),
  dayNumber: z.number().int().min(1).max(30),
  text: z.string().min(30).max(2200),
  altHooks: z.array(z.string()).max(3),
});

const idSchema = z.object({
  campaignId: z.string().min(1),
});

const regenerateActSchema = z.object({
  campaignId: z.string().min(1),
  actNumber: z.number().int().min(1).max(3),
});

const regenerateDaySchema = z.object({
  campaignId: z.string().min(1),
  dayNumber: z.number().int().min(1).max(30),
});

const approveOutlineSchema = z.object({
  dayOutlineId: z.string().min(1),
  approved: z.boolean(),
});

const approvePostSchema = z.object({
  campaignId: z.string().min(1),
  dayNumber: z.number().int().min(1).max(30),
  approved: z.boolean(),
});

const restoreVersionSchema = z.object({
  type: z.enum(["outline", "post"]),
  versionId: z.string().min(1),
});

const updateBrandSchema = z.object({
  companyName: z.string().min(2),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  primaryOffer: z.string().optional(),
});

const updateBibleSchema = z.object({
  campaignId: z.string().min(1),
  voiceStyle: z.string().min(3),
  audience: z.string().min(3),
  goal: z.string().min(3),
  pillars: z.string().min(3),
  forbidden: z.string().min(3),
  ctaPreference: z.string().optional(),
});

function asStringArray(input: Prisma.JsonValue): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((item): item is string => typeof item === "string");
}

function toCampaignBible(campaign: {
  voiceStyle: string;
  audience: string;
  goal: string;
  pillars: Prisma.JsonValue;
  forbidden: Prisma.JsonValue;
  ctaPreference: string | null;
}): CampaignBible {
  return {
    voiceStyle: campaign.voiceStyle,
    audience: campaign.audience,
    goal: campaign.goal,
    pillars: asStringArray(campaign.pillars),
    forbidden: asStringArray(campaign.forbidden),
    ctaPreference: campaign.ctaPreference,
  };
}

function toOutlineInput(day: {
  dayNumber: number;
  actNumber: number;
  title: string;
  hook: string;
  format: string;
  keyPoints: Prisma.JsonValue;
  cta: string;
  constraints: string | null;
}): OutlineDayInput {
  return {
    dayNumber: day.dayNumber,
    actNumber: day.actNumber,
    title: day.title,
    hook: day.hook,
    format: day.format,
    keyPoints: asStringArray(day.keyPoints),
    cta: day.cta,
    constraints: day.constraints,
  };
}

async function applyGeneratedOutlines(params: {
  campaignId: string;
  generatedDays: OutlineDayInput[];
  source: string;
}) {
  const existing = await db.dayOutline.findMany({
    where: { campaignId: params.campaignId },
  });

  const existingByDay = new Map(
    existing.map((entry) => [entry.dayNumber, entry]),
  );

  await db.$transaction(async (tx) => {
    for (const generatedDay of params.generatedDays) {
      const current = existingByDay.get(generatedDay.dayNumber);
      if (current) {
        await tx.dayOutlineVersion.create({
          data: {
            campaignId: current.campaignId,
            dayOutlineId: current.id,
            versionNumber: current.versionNumber,
            source: params.source,
            snapshot: {
              dayNumber: current.dayNumber,
              actNumber: current.actNumber,
              title: current.title,
              hook: current.hook,
              format: current.format,
              keyPoints: current.keyPoints,
              cta: current.cta,
              constraints: current.constraints,
              status: current.status,
            },
          },
        });

        await tx.dayOutline.update({
          where: { id: current.id },
          data: {
            actNumber: generatedDay.actNumber,
            title: generatedDay.title,
            hook: generatedDay.hook,
            format: generatedDay.format,
            keyPoints: generatedDay.keyPoints,
            cta: generatedDay.cta,
            constraints: generatedDay.constraints || null,
            status: DayStatus.DRAFT,
            versionNumber: { increment: 1 },
          },
        });
      } else {
        await tx.dayOutline.create({
          data: {
            campaignId: params.campaignId,
            dayNumber: generatedDay.dayNumber,
            actNumber: generatedDay.actNumber,
            title: generatedDay.title,
            hook: generatedDay.hook,
            format: generatedDay.format,
            keyPoints: generatedDay.keyPoints,
            cta: generatedDay.cta,
            constraints: generatedDay.constraints || null,
          },
        });
      }
    }
  });
}

async function upsertGeneratedPost(params: {
  campaignId: string;
  dayNumber: number;
  post: { text: string; altHooks: string[] };
  source: string;
}) {
  const existing = await db.dayPost.findUnique({
    where: {
      campaignId_dayNumber: {
        campaignId: params.campaignId,
        dayNumber: params.dayNumber,
      },
    },
  });

  if (existing) {
    await createPostVersion(existing, params.source);

    await db.dayPost.update({
      where: { id: existing.id },
      data: {
        text: params.post.text,
        altHooks: params.post.altHooks,
        status: DayStatus.DRAFT,
        versionNumber: { increment: 1 },
      },
    });

    return;
  }

  await db.dayPost.create({
    data: {
      campaignId: params.campaignId,
      dayNumber: params.dayNumber,
      text: params.post.text,
      altHooks: params.post.altHooks,
      status: DayStatus.DRAFT,
    },
  });
}

async function createCampaign(input: z.infer<typeof createCampaignSchema>) {
  const parsed = createCampaignSchema.parse(input);

  const template = await db.campaignTemplate.findUnique({
    where: { id: parsed.templateId },
  });
  if (!template) {
    throw new Error("Template not found.");
  }

  const campaign = await db.campaign.create({
    data: {
      name: parsed.name,
      theme: parsed.theme,
      templateId: parsed.templateId,
      voiceStyle: parsed.voiceStyle,
      audience: parsed.audience,
      goal: parsed.goal,
      pillars: normalizeStringList(parsed.pillars),
      forbidden: normalizeStringList(parsed.forbidden),
      ctaPreference: parsed.ctaPreference || null,
    },
  });

  const skeleton = createOutlineSkeleton(template, parsed.theme);

  await db.dayOutline.createMany({
    data: skeleton.map((entry) => ({
      campaignId: campaign.id,
      dayNumber: entry.dayNumber,
      actNumber: entry.actNumber,
      title: entry.title,
      hook: entry.hook,
      format: entry.format,
      keyPoints: entry.keyPoints,
      cta: entry.cta,
      constraints: entry.constraints,
      status: entry.status,
    })),
  });

  revalidatePath("/");
  revalidatePath(`/campaigns/${campaign.id}`);

  return { campaignId: campaign.id };
}

async function updateBrandProfile(input: z.infer<typeof updateBrandSchema>) {
  const parsed = updateBrandSchema.parse(input);

  const current = await db.brandProfile.findFirst();

  if (current) {
    await db.brandProfile.update({
      where: { id: current.id },
      data: {
        companyName: parsed.companyName,
        description: parsed.description || null,
        website: parsed.website || null,
        primaryOffer: parsed.primaryOffer || null,
      },
    });
  } else {
    await db.brandProfile.create({
      data: {
        companyName: parsed.companyName,
        description: parsed.description || null,
        website: parsed.website || null,
        primaryOffer: parsed.primaryOffer || null,
      },
    });
  }

  revalidatePath("/brand");
}

async function updateCampaignBible(input: z.infer<typeof updateBibleSchema>) {
  const parsed = updateBibleSchema.parse(input);

  await db.campaign.update({
    where: { id: parsed.campaignId },
    data: {
      voiceStyle: parsed.voiceStyle,
      audience: parsed.audience,
      goal: parsed.goal,
      pillars: normalizeStringList(parsed.pillars),
      forbidden: normalizeStringList(parsed.forbidden),
      ctaPreference: parsed.ctaPreference || null,
    },
  });

  revalidatePath(`/campaigns/${parsed.campaignId}`);
}

async function generateOutlineAll(input: z.infer<typeof idSchema>) {
  const parsed = idSchema.parse(input);

  const campaign = await db.campaign.findUnique({
    where: { id: parsed.campaignId },
    include: {
      template: true,
      dayOutlines: { orderBy: { dayNumber: "asc" } },
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (campaign.isOutlineLocked) {
    throw new Error("Unlock campaign before regenerating the outline.");
  }

  const generated = await runTask<{ days: OutlineDayInput[] }>("OUTLINE_ALL", {
    campaignId: campaign.id,
    campaignName: campaign.name,
    theme: campaign.theme,
    bible: toCampaignBible(campaign),
    template: {
      name: campaign.template.name,
      act1Intent: campaign.template.act1Intent,
      act2Intent: campaign.template.act2Intent,
      act3Intent: campaign.template.act3Intent,
      formatRotation: campaign.template.formatRotation,
    },
    dayOutlines: campaign.dayOutlines.map(toOutlineInput),
  });

  await applyGeneratedOutlines({
    campaignId: campaign.id,
    generatedDays: generated.data.days,
    source: `generate_outline_all:${generated.meta.model}`,
  });

  revalidatePath(`/campaigns/${parsed.campaignId}`);
}

async function generateOutlineAct(input: z.infer<typeof regenerateActSchema>) {
  const parsed = regenerateActSchema.parse(input);
  const campaign = await db.campaign.findUnique({
    where: { id: parsed.campaignId },
    include: {
      template: true,
      dayOutlines: { orderBy: { dayNumber: "asc" } },
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (campaign.isOutlineLocked) {
    throw new Error("Unlock campaign before regenerating an act.");
  }

  const generated = await runTask<{ days: OutlineDayInput[] }>("OUTLINE_ACT", {
    campaignId: campaign.id,
    campaignName: campaign.name,
    theme: campaign.theme,
    bible: toCampaignBible(campaign),
    template: {
      name: campaign.template.name,
      act1Intent: campaign.template.act1Intent,
      act2Intent: campaign.template.act2Intent,
      act3Intent: campaign.template.act3Intent,
      formatRotation: campaign.template.formatRotation,
    },
    dayOutlines: campaign.dayOutlines.map(toOutlineInput),
    targetAct: parsed.actNumber,
  });

  await applyGeneratedOutlines({
    campaignId: campaign.id,
    generatedDays: generated.data.days,
    source: `regenerate_act_${parsed.actNumber}:${generated.meta.model}`,
  });

  revalidatePath(`/campaigns/${parsed.campaignId}`);
}

async function generateOutlineDay(input: z.infer<typeof regenerateDaySchema>) {
  const parsed = regenerateDaySchema.parse(input);

  const campaign = await db.campaign.findUnique({
    where: { id: parsed.campaignId },
    include: {
      template: true,
      dayOutlines: { orderBy: { dayNumber: "asc" } },
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (campaign.isOutlineLocked) {
    throw new Error("Unlock campaign before regenerating a day.");
  }

  const generated = await runTask<{ days: OutlineDayInput[] }>("OUTLINE_DAY", {
    campaignId: campaign.id,
    campaignName: campaign.name,
    theme: campaign.theme,
    bible: toCampaignBible(campaign),
    template: {
      name: campaign.template.name,
      act1Intent: campaign.template.act1Intent,
      act2Intent: campaign.template.act2Intent,
      act3Intent: campaign.template.act3Intent,
      formatRotation: campaign.template.formatRotation,
    },
    dayOutlines: campaign.dayOutlines.map(toOutlineInput),
    targetDay: parsed.dayNumber,
  });

  await applyGeneratedOutlines({
    campaignId: campaign.id,
    generatedDays: generated.data.days,
    source: `regenerate_outline_day:${generated.meta.model}`,
  });

  revalidatePath(`/campaigns/${parsed.campaignId}`);
}

async function lockCampaign(input: z.infer<typeof idSchema>) {
  const parsed = idSchema.parse(input);

  await db.campaign.update({
    where: { id: parsed.campaignId },
    data: { isOutlineLocked: true },
  });

  revalidatePath(`/campaigns/${parsed.campaignId}`);
}

async function unlockCampaign(
  input: z.infer<typeof idSchema> & { confirmDrift?: boolean },
) {
  const parsed = idSchema.parse(input);
  const campaign = await db.campaign.findUnique({
    where: { id: parsed.campaignId },
    include: { dayPosts: true },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (campaign.dayPosts.length > 0 && !input.confirmDrift) {
    throw new Error("Unlocking may drift existing posts. Confirm to proceed.");
  }

  await db.campaign.update({
    where: { id: parsed.campaignId },
    data: { isOutlineLocked: false },
  });

  revalidatePath(`/campaigns/${parsed.campaignId}`);
}

async function saveEditsOutlineDay(
  input: z.infer<typeof saveOutlineEditsSchema>,
) {
  const parsed = saveOutlineEditsSchema.parse(input);

  const outline = await db.dayOutline.findUnique({
    where: { id: parsed.dayOutlineId },
  });
  if (!outline) {
    throw new Error("Outline not found.");
  }

  await createOutlineVersion(outline, "manual_edit");

  await db.dayOutline.update({
    where: { id: parsed.dayOutlineId },
    data: {
      title: parsed.title,
      hook: parsed.hook,
      format: parsed.format,
      keyPoints: parsed.keyPoints,
      cta: parsed.cta,
      constraints: parsed.constraints || null,
      status: DayStatus.DRAFT,
      versionNumber: { increment: 1 },
    },
  });

  revalidatePath(`/campaigns/${outline.campaignId}`);
}

async function saveEditsPostDay(input: z.infer<typeof savePostEditsSchema>) {
  const parsed = savePostEditsSchema.parse(input);

  const existing = await db.dayPost.findUnique({
    where: {
      campaignId_dayNumber: {
        campaignId: parsed.campaignId,
        dayNumber: parsed.dayNumber,
      },
    },
  });

  if (existing) {
    await createPostVersion(existing, "manual_edit");

    await db.dayPost.update({
      where: { id: existing.id },
      data: {
        text: parsed.text,
        altHooks: parsed.altHooks,
        status: DayStatus.DRAFT,
        versionNumber: { increment: 1 },
      },
    });
  } else {
    await db.dayPost.create({
      data: {
        campaignId: parsed.campaignId,
        dayNumber: parsed.dayNumber,
        text: parsed.text,
        altHooks: parsed.altHooks,
      },
    });
  }

  revalidatePath(`/campaigns/${parsed.campaignId}`);
}

async function generatePostDay(input: z.infer<typeof regenerateDaySchema>) {
  const parsed = regenerateDaySchema.parse(input);

  const campaign = await db.campaign.findUnique({
    where: { id: parsed.campaignId },
    include: {
      dayOutlines: { orderBy: { dayNumber: "asc" } },
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (!campaign.isOutlineLocked) {
    throw new Error("Lock the outline before generating posts.");
  }

  const generated = await runTask<{ text: string; altHooks: string[] }>(
    "POST_DAY",
    {
      campaignId: campaign.id,
      campaignName: campaign.name,
      theme: campaign.theme,
      bible: toCampaignBible(campaign),
      dayOutlines: campaign.dayOutlines.map(toOutlineInput),
      targetDay: parsed.dayNumber,
    },
  );

  await upsertGeneratedPost({
    campaignId: campaign.id,
    dayNumber: parsed.dayNumber,
    post: {
      text: generated.data.text,
      altHooks: generated.data.altHooks.slice(0, 3),
    },
    source: `regenerate_post_day:${generated.meta.model}`,
  });

  revalidatePath(`/campaigns/${parsed.campaignId}`);
}

async function generatePostsAll(input: z.infer<typeof idSchema>) {
  const parsed = idSchema.parse(input);

  const campaign = await db.campaign.findUnique({
    where: { id: parsed.campaignId },
    include: {
      dayOutlines: { orderBy: { dayNumber: "asc" } },
      dayPosts: true,
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (!campaign.isOutlineLocked) {
    throw new Error("Lock the outline before generating posts.");
  }

  const generated = await runTask<{ posts: PostDayInput[] }>("POST_ALL", {
    campaignId: campaign.id,
    campaignName: campaign.name,
    theme: campaign.theme,
    bible: toCampaignBible(campaign),
    dayOutlines: campaign.dayOutlines.map(toOutlineInput),
  });

  for (const post of generated.data.posts) {
    await upsertGeneratedPost({
      campaignId: campaign.id,
      dayNumber: post.dayNumber,
      post: {
        text: post.text,
        altHooks: post.altHooks.slice(0, 3),
      },
      source: `generate_posts_all:${generated.meta.model}`,
    });
  }

  revalidatePath(`/campaigns/${parsed.campaignId}`);
}

async function approveOutlineDay(input: z.infer<typeof approveOutlineSchema>) {
  const parsed = approveOutlineSchema.parse(input);

  const outline = await db.dayOutline.update({
    where: { id: parsed.dayOutlineId },
    data: {
      status: parsed.approved ? DayStatus.APPROVED : DayStatus.DRAFT,
    },
  });

  revalidatePath(`/campaigns/${outline.campaignId}`);
}

async function approvePostDay(input: z.infer<typeof approvePostSchema>) {
  const parsed = approvePostSchema.parse(input);

  const post = await db.dayPost.findUnique({
    where: {
      campaignId_dayNumber: {
        campaignId: parsed.campaignId,
        dayNumber: parsed.dayNumber,
      },
    },
  });

  if (!post) {
    throw new Error("Post not found.");
  }

  await db.dayPost.update({
    where: { id: post.id },
    data: {
      status: parsed.approved ? DayStatus.APPROVED : DayStatus.DRAFT,
    },
  });

  revalidatePath(`/campaigns/${parsed.campaignId}`);
}

async function restoreVersion(input: z.infer<typeof restoreVersionSchema>) {
  const parsed = restoreVersionSchema.parse(input);

  if (parsed.type === "outline") {
    const version = await db.dayOutlineVersion.findUnique({
      where: { id: parsed.versionId },
    });
    if (!version) {
      throw new Error("Outline version not found.");
    }

    const outline = await db.dayOutline.findUnique({
      where: { id: version.dayOutlineId },
    });
    if (!outline) {
      throw new Error("Outline not found.");
    }

    await createOutlineVersion(outline, "restore_version");

    const snapshot = version.snapshot as Prisma.JsonObject;
    await db.dayOutline.update({
      where: { id: outline.id },
      data: {
        title: String(snapshot.title || outline.title),
        hook: String(snapshot.hook || outline.hook),
        format: String(snapshot.format || outline.format),
        keyPoints: Array.isArray(snapshot.keyPoints)
          ? asStringArray(snapshot.keyPoints as Prisma.JsonValue)
          : asStringArray(outline.keyPoints),
        cta: String(snapshot.cta || outline.cta),
        constraints: snapshot.constraints ? String(snapshot.constraints) : null,
        status:
          snapshot.status === DayStatus.APPROVED
            ? DayStatus.APPROVED
            : DayStatus.DRAFT,
        versionNumber: { increment: 1 },
      },
    });

    revalidatePath(`/campaigns/${outline.campaignId}`);
    return;
  }

  const version = await db.dayPostVersion.findUnique({
    where: { id: parsed.versionId },
  });
  if (!version) {
    throw new Error("Post version not found.");
  }

  const post = await db.dayPost.findUnique({
    where: { id: version.dayPostId },
  });
  if (!post) {
    throw new Error("Post not found.");
  }

  await createPostVersion(post, "restore_version");

  const snapshot = version.snapshot as Prisma.JsonObject;

  await db.dayPost.update({
    where: { id: post.id },
    data: {
      text: String(snapshot.text || post.text),
      altHooks: Array.isArray(snapshot.altHooks)
        ? asStringArray(snapshot.altHooks as Prisma.JsonValue)
        : asStringArray(post.altHooks),
      status:
        snapshot.status === DayStatus.APPROVED
          ? DayStatus.APPROVED
          : DayStatus.DRAFT,
      versionNumber: { increment: 1 },
    },
  });

  revalidatePath(`/campaigns/${post.campaignId}`);
}

export {
  approveOutlineDay,
  approvePostDay,
  createCampaign,
  generateOutlineAct,
  generateOutlineAll,
  generateOutlineDay,
  generatePostDay,
  generatePostsAll,
  lockCampaign,
  restoreVersion,
  saveEditsOutlineDay,
  saveEditsPostDay,
  unlockCampaign,
  updateBrandProfile,
  updateCampaignBible,
};
