-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "muscleGroups" TEXT[],
    "equipment" TEXT[],
    "difficulty" TEXT NOT NULL,
    "instructions" TEXT[],
    "tips" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);
