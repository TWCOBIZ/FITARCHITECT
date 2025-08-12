-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "freeWorkoutGenerationsResetDate" TIMESTAMP(3),
ADD COLUMN     "freeWorkoutGenerationsUsed" INTEGER NOT NULL DEFAULT 0;
