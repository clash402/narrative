"use server";

import { DayStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createOutlineSkeleton,
  normalizeStringList,
  toActNumber,
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

function buildDraftPostText(params: {
  title: string;
  hook: string;
  keyPoints: string[];
  cta: string;
  theme: string;
}): string {
  const lines = [
    params.hook,
    "",
    `Today in the campaign: ${params.title}`,
    "",
    ...params.keyPoints.map((point, index) => `${index + 1}) ${point}`),
    "",
    `Theme tie-in: ${params.theme}.`,
    "",
    params.cta,
  ];

  return lines.join("\n").slice(0, 2200);
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
    include: { template: true, dayOutlines: true },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const outline = createOutlineSkeleton(campaign.template, campaign.theme);

  await db.$transaction(async (tx) => {
    for (const item of outline) {
      const existing = campaign.dayOutlines.find(
        (entry) => entry.dayNumber === item.dayNumber,
      );

      if (existing) {
        await tx.dayOutlineVersion.create({
          data: {
            campaignId: existing.campaignId,
            dayOutlineId: existing.id,
            versionNumber: existing.versionNumber,
            source: "generate_outline_all",
            snapshot: {
              dayNumber: existing.dayNumber,
              actNumber: existing.actNumber,
              title: existing.title,
              hook: existing.hook,
              format: existing.format,
              keyPoints: existing.keyPoints,
              cta: existing.cta,
              constraints: existing.constraints,
              status: existing.status,
            },
          },
        });

        await tx.dayOutline.update({
          where: { id: existing.id },
          data: {
            actNumber: item.actNumber,
            title: item.title,
            hook: item.hook,
            format: item.format,
            keyPoints: item.keyPoints,
            cta: item.cta,
            constraints: item.constraints,
            status: DayStatus.DRAFT,
            versionNumber: { increment: 1 },
          },
        });
      }
    }
  });

  revalidatePath(`/campaigns/${parsed.campaignId}`);
}

async function generateOutlineAct(input: z.infer<typeof regenerateActSchema>) {
  const parsed = regenerateActSchema.parse(input);
  const campaign = await db.campaign.findUnique({
    where: { id: parsed.campaignId },
    include: { template: true, dayOutlines: true },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const full = createOutlineSkeleton(campaign.template, campaign.theme);
  const subset = full.filter((entry) => entry.actNumber === parsed.actNumber);

  await db.$transaction(async (tx) => {
    for (const item of subset) {
      const existing = campaign.dayOutlines.find(
        (entry) => entry.dayNumber === item.dayNumber,
      );
      if (!existing) {
        continue;
      }

      await tx.dayOutlineVersion.create({
        data: {
          campaignId: existing.campaignId,
          dayOutlineId: existing.id,
          versionNumber: existing.versionNumber,
          source: `regenerate_act_${parsed.actNumber}`,
          snapshot: {
            dayNumber: existing.dayNumber,
            actNumber: existing.actNumber,
            title: existing.title,
            hook: existing.hook,
            format: existing.format,
            keyPoints: existing.keyPoints,
            cta: existing.cta,
            constraints: existing.constraints,
            status: existing.status,
          },
        },
      });

      await tx.dayOutline.update({
        where: { id: existing.id },
        data: {
          title: item.title,
          hook: item.hook,
          format: item.format,
          keyPoints: item.keyPoints,
          cta: item.cta,
          constraints: item.constraints,
          status: DayStatus.DRAFT,
          versionNumber: { increment: 1 },
        },
      });
    }
  });

  revalidatePath(`/campaigns/${parsed.campaignId}`);
}

async function generateOutlineDay(input: z.infer<typeof regenerateDaySchema>) {
  const parsed = regenerateDaySchema.parse(input);

  const campaign = await db.campaign.findUnique({
    where: { id: parsed.campaignId },
    include: { template: true, dayOutlines: true },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const outline = campaign.dayOutlines.find(
    (entry) => entry.dayNumber === parsed.dayNumber,
  );
  if (!outline) {
    throw new Error("Outline day not found.");
  }

  await createOutlineVersion(outline, "regenerate_outline_day");

  const actNumber = toActNumber(parsed.dayNumber);
  const formats = Array.isArray(campaign.template.formatRotation)
    ? (campaign.template.formatRotation as string[])
    : ["story"];
  const format = formats[(parsed.dayNumber - 1) % formats.length] ?? "story";

  await db.dayOutline.update({
    where: { id: outline.id },
    data: {
      actNumber,
      title: `Day ${parsed.dayNumber}: ${campaign.theme}`,
      hook: `A high-signal ${format} post for Act ${actNumber}.`,
      format,
      keyPoints: [
        `Day ${parsed.dayNumber} insight`,
        `Tie the message to ${campaign.goal}`,
        "End with practical next step",
      ],
      cta: campaign.ctaPreference || "Invite comments from peers.",
      status: DayStatus.DRAFT,
      versionNumber: { increment: 1 },
    },
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
      dayOutlines: true,
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (!campaign.isOutlineLocked) {
    throw new Error("Lock the outline before generating posts.");
  }

  const outline = campaign.dayOutlines.find(
    (entry) => entry.dayNumber === parsed.dayNumber,
  );
  if (!outline) {
    throw new Error("Outline not found for day.");
  }

  const text = buildDraftPostText({
    title: outline.title,
    hook: outline.hook,
    keyPoints: (outline.keyPoints as string[]) || [],
    cta: outline.cta,
    theme: campaign.theme,
  });

  const existing = await db.dayPost.findUnique({
    where: {
      campaignId_dayNumber: {
        campaignId: parsed.campaignId,
        dayNumber: parsed.dayNumber,
      },
    },
  });

  if (existing) {
    await createPostVersion(existing, "regenerate_post_day");

    await db.dayPost.update({
      where: { id: existing.id },
      data: {
        text,
        altHooks: [
          outline.hook,
          `What most people miss about ${outline.title}`,
          `A field note on ${outline.title}`,
        ],
        status: DayStatus.DRAFT,
        versionNumber: { increment: 1 },
      },
    });
  } else {
    await db.dayPost.create({
      data: {
        campaignId: parsed.campaignId,
        dayNumber: parsed.dayNumber,
        text,
        altHooks: [
          outline.hook,
          `What most people miss about ${outline.title}`,
          `A field note on ${outline.title}`,
        ],
      },
    });
  }

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

  await db.$transaction(async (tx) => {
    for (const outline of campaign.dayOutlines) {
      const existingPost = campaign.dayPosts.find(
        (post) => post.dayNumber === outline.dayNumber,
      );
      const text = buildDraftPostText({
        title: outline.title,
        hook: outline.hook,
        keyPoints: (outline.keyPoints as string[]) || [],
        cta: outline.cta,
        theme: campaign.theme,
      });

      const altHooks = [
        outline.hook,
        `Three lessons from ${outline.title}`,
        `A contrarian take on ${outline.title}`,
      ];

      if (existingPost) {
        await tx.dayPostVersion.create({
          data: {
            campaignId: existingPost.campaignId,
            dayPostId: existingPost.id,
            versionNumber: existingPost.versionNumber,
            source: "generate_posts_all",
            snapshot: {
              dayNumber: existingPost.dayNumber,
              text: existingPost.text,
              altHooks: existingPost.altHooks,
              status: existingPost.status,
            },
          },
        });

        await tx.dayPost.update({
          where: { id: existingPost.id },
          data: {
            text,
            altHooks,
            status: DayStatus.DRAFT,
            versionNumber: { increment: 1 },
          },
        });
      } else {
        await tx.dayPost.create({
          data: {
            campaignId: campaign.id,
            dayNumber: outline.dayNumber,
            text,
            altHooks,
          },
        });
      }
    }
  });

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
          ? snapshot.keyPoints
          : outline.keyPoints,
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
        ? snapshot.altHooks
        : post.altHooks,
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
