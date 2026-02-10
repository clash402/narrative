import { DayStatus, type CampaignTemplate } from "@prisma/client";

type OutlineSeed = {
  dayNumber: number;
  actNumber: number;
  title: string;
  hook: string;
  format: string;
  keyPoints: string[];
  cta: string;
  constraints: string;
  status: DayStatus;
};

function getActIntent(template: CampaignTemplate, actNumber: number): string {
  if (actNumber === 1) {
    return template.act1Intent;
  }

  if (actNumber === 2) {
    return template.act2Intent;
  }

  return template.act3Intent;
}

function normalizeStringList(input: string): string[] {
  return input
    .split(/\n|,/)
    .map((item) => item.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function toActNumber(dayNumber: number): number {
  if (dayNumber <= 10) {
    return 1;
  }
  if (dayNumber <= 20) {
    return 2;
  }
  return 3;
}

function createOutlineSkeleton(
  template: CampaignTemplate,
  theme: string,
): OutlineSeed[] {
  const formats = Array.isArray(template.formatRotation)
    ? (template.formatRotation as string[])
    : ["story", "how-to", "list"];

  return Array.from({ length: 30 }, (_, index) => {
    const dayNumber = index + 1;
    const actNumber = toActNumber(dayNumber);
    const actIntent = getActIntent(template, actNumber);
    const format = formats[index % formats.length] ?? "story";

    return {
      dayNumber,
      actNumber,
      title: `Day ${dayNumber}: ${theme}`,
      hook: `A focused ${format} post that advances ${actIntent}.`,
      format,
      keyPoints: [
        `Core insight for day ${dayNumber}`,
        `Example tied to ${theme}`,
        "Actionable takeaway",
      ],
      cta: "Invite reflection in the comments.",
      constraints: "Keep concise and skimmable.",
      status: DayStatus.DRAFT,
    };
  });
}

export { createOutlineSkeleton, normalizeStringList, toActNumber };
