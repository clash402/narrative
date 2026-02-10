import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TemplateSeed = {
  slug: string;
  name: string;
  description: string;
  act1Intent: string;
  act2Intent: string;
  act3Intent: string;
  formatRotation: string[];
};

const templates: TemplateSeed[] = [
  {
    slug: "authority-arc",
    name: "Authority Arc",
    description:
      "Build trust with strong perspective, teaching, and proof-led invitations.",
    act1Intent: "worldview + credibility",
    act2Intent: "frameworks + teaching",
    act3Intent: "proof + invites",
    formatRotation: [
      "story",
      "list",
      "myth-bust",
      "mini-case",
      "how-to",
      "contrarian take",
      "behind-the-scenes",
    ],
  },
  {
    slug: "launch-arc",
    name: "Product/Service Launch Arc",
    description:
      "Frame the problem, educate on solution, and drive a launch window.",
    act1Intent: "problem + story + stakes",
    act2Intent: "solution education + objections",
    act3Intent: "launch + proof + CTA",
    formatRotation: [
      "story",
      "problem breakdown",
      "myth-bust",
      "before-after",
      "how-to",
      "FAQ",
      "behind-the-scenes",
    ],
  },
  {
    slug: "career-growth-arc",
    name: "Career Growth Arc",
    description:
      "Show positioning, skill systems, and outcomes that attract opportunities.",
    act1Intent: "positioning + values",
    act2Intent: "skills + systems",
    act3Intent: "outcomes + network invites",
    formatRotation: [
      "story",
      "lesson list",
      "myth-bust",
      "mini-case",
      "how-to",
      "contrarian take",
      "network prompt",
    ],
  },
];

async function main() {
  await Promise.all(
    templates.map((template) =>
      prisma.campaignTemplate.upsert({
        where: { slug: template.slug },
        update: {
          name: template.name,
          description: template.description,
          act1Intent: template.act1Intent,
          act2Intent: template.act2Intent,
          act3Intent: template.act3Intent,
          formatRotation: template.formatRotation,
        },
        create: template,
      }),
    ),
  );

  const brandCount = await prisma.brandProfile.count();
  if (brandCount === 0) {
    await prisma.brandProfile.create({
      data: {
        companyName: "My Brand",
        description: "B2B creator-led business",
        primaryOffer: "Consulting",
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
