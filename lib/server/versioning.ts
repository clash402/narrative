import type { DayOutline, DayPost } from "@prisma/client";

import { db } from "@/lib/server/db";

async function createOutlineVersion(outline: DayOutline, source: string) {
  await db.dayOutlineVersion.create({
    data: {
      campaignId: outline.campaignId,
      dayOutlineId: outline.id,
      versionNumber: outline.versionNumber,
      source,
      snapshot: {
        dayNumber: outline.dayNumber,
        actNumber: outline.actNumber,
        title: outline.title,
        hook: outline.hook,
        format: outline.format,
        keyPoints: outline.keyPoints,
        cta: outline.cta,
        constraints: outline.constraints,
        status: outline.status,
      },
    },
  });
}

async function createPostVersion(post: DayPost, source: string) {
  await db.dayPostVersion.create({
    data: {
      campaignId: post.campaignId,
      dayPostId: post.id,
      versionNumber: post.versionNumber,
      source,
      snapshot: {
        dayNumber: post.dayNumber,
        text: post.text,
        altHooks: post.altHooks,
        status: post.status,
      },
    },
  });
}

export { createOutlineVersion, createPostVersion };
