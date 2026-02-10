import { notFound } from "next/navigation";

import { db } from "@/lib/server/db";
import {
  serializeCampaign,
  serializeOutline,
  serializePost,
  serializeOutlineVersion,
  serializePostVersion,
} from "@/lib/server/serializers";

async function getTemplates() {
  const templates = await db.campaignTemplate.findMany({
    orderBy: { createdAt: "asc" },
  });
  return templates.map((template) => ({
    ...template,
    formatRotation: Array.isArray(template.formatRotation)
      ? (template.formatRotation as string[])
      : [],
  }));
}

async function getCampaignList() {
  return db.campaign.findMany({
    include: { template: true, dayOutlines: true, dayPosts: true },
    orderBy: { updatedAt: "desc" },
  });
}

async function getWorkspace(campaignId: string) {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      template: true,
      dayOutlines: {
        orderBy: { dayNumber: "asc" },
        include: { versions: true },
      },
      dayPosts: { orderBy: { dayNumber: "asc" }, include: { versions: true } },
    },
  });

  if (!campaign) {
    notFound();
  }

  return {
    campaign: serializeCampaign(campaign),
    outlines: campaign.dayOutlines.map(serializeOutline),
    posts: campaign.dayPosts.map(serializePost),
    outlineVersions: campaign.dayOutlines.flatMap((outline) =>
      outline.versions.map(serializeOutlineVersion),
    ),
    postVersions: campaign.dayPosts.flatMap((post) =>
      post.versions.map(serializePostVersion),
    ),
  };
}

async function getOutlineVersions(dayOutlineId: string) {
  const versions = await db.dayOutlineVersion.findMany({
    where: { dayOutlineId },
    orderBy: { createdAt: "desc" },
  });

  return versions.map(serializeOutlineVersion);
}

async function getPostVersions(dayPostId: string) {
  const versions = await db.dayPostVersion.findMany({
    where: { dayPostId },
    orderBy: { createdAt: "desc" },
  });

  return versions.map(serializePostVersion);
}

export {
  getTemplates,
  getCampaignList,
  getWorkspace,
  getOutlineVersions,
  getPostVersions,
};
