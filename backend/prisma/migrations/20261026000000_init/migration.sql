-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "dateLabel" TEXT,
    "location" TEXT,
    "coverPhotoId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "error" TEXT,
    "widths" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "version" TEXT,
    "color" TEXT,
    "blur" TEXT,
    "alt" TEXT,
    "caption" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "title" TEXT,
    "caption" TEXT,
    "shape" TEXT NOT NULL DEFAULT 'landscape',
    "thumbnailUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL DEFAULT 'profile',
    "displayName" TEXT,
    "intro" TEXT,
    "bio" TEXT,
    "email" TEXT,
    "instagram" TEXT,
    "location" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_published_position_idx" ON "Project"("published", "position");

-- CreateIndex
CREATE INDEX "Photo_projectId_position_idx" ON "Photo"("projectId", "position");

-- CreateIndex
CREATE INDEX "Photo_status_idx" ON "Photo"("status");

-- CreateIndex
CREATE INDEX "Video_projectId_position_idx" ON "Video"("projectId", "position");

-- CreateIndex
CREATE INDEX "Note_status_createdAt_idx" ON "Note"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Note_ipHash_createdAt_idx" ON "Note"("ipHash", "createdAt");

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

