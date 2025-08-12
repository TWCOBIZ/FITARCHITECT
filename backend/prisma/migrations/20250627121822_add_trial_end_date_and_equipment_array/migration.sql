/*
  Warnings:

  - You are about to drop the column `freeWorkoutGenerationsResetDate` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `freeWorkoutGenerationsUsed` on the `user_profiles` table. All the data in the column will be lost.
  - The `equipmentAvailability` column on the `user_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "WorkoutPlan" ADD COLUMN     "weeks" JSONB;

-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "freeWorkoutGenerationsResetDate",
DROP COLUMN "freeWorkoutGenerationsUsed",
ADD COLUMN     "freeWorkoutTrialStartDate" TIMESTAMP(3),
ADD COLUMN     "freeWorkoutTrialUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trialEndDate" TIMESTAMP(3),
DROP COLUMN "equipmentAvailability",
ADD COLUMN     "equipmentAvailability" TEXT[];
