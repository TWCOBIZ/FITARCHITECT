-- AlterTable
ALTER TABLE "WorkoutLog" ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "completionRate" DOUBLE PRECISION,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "rating" INTEGER;

-- AlterTable
ALTER TABLE "WorkoutPlan" ADD COLUMN     "equipment" TEXT[],
ADD COLUMN     "estimatedDuration" INTEGER,
ADD COLUMN     "source" TEXT;
