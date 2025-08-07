-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "flaggedReason" TEXT,
ADD COLUMN     "gifPath" TEXT,
ADD COLUMN     "hideGif" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT;
