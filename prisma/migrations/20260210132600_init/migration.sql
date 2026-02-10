-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "primaryOffer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CampaignTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "act1Intent" TEXT NOT NULL,
    "act2Intent" TEXT NOT NULL,
    "act3Intent" TEXT NOT NULL,
    "formatRotation" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "voiceStyle" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "pillars" JSONB NOT NULL,
    "forbidden" JSONB NOT NULL,
    "ctaPreference" TEXT,
    "isOutlineLocked" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CampaignTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DayOutline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "actNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "keyPoints" JSONB NOT NULL,
    "cta" TEXT NOT NULL,
    "constraints" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DayOutline_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DayOutlineVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "dayOutlineId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DayOutlineVersion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DayOutlineVersion_dayOutlineId_fkey" FOREIGN KEY ("dayOutlineId") REFERENCES "DayOutline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DayPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "altHooks" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DayPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DayPostVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "dayPostId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DayPostVersion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DayPostVersion_dayPostId_fkey" FOREIGN KEY ("dayPostId") REFERENCES "DayPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignTemplate_slug_key" ON "CampaignTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DayOutline_campaignId_dayNumber_key" ON "DayOutline"("campaignId", "dayNumber");

-- CreateIndex
CREATE INDEX "DayOutlineVersion_campaignId_dayOutlineId_idx" ON "DayOutlineVersion"("campaignId", "dayOutlineId");

-- CreateIndex
CREATE UNIQUE INDEX "DayPost_campaignId_dayNumber_key" ON "DayPost"("campaignId", "dayNumber");

-- CreateIndex
CREATE INDEX "DayPostVersion_campaignId_dayPostId_idx" ON "DayPostVersion"("campaignId", "dayPostId");

