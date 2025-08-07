-- AlterTable
ALTER TABLE "WorkoutPlan" ADD COLUMN     "completedWorkouts" JSONB,
ADD COLUMN     "lastWorkoutCompleted" TIMESTAMP(3),
ADD COLUMN     "progressData" JSONB;

-- CreateTable
CREATE TABLE "ErrorReport" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "userAgent" TEXT,
    "url" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "ipAddress" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErrorReport_pkey" PRIMARY KEY ("id")
);
