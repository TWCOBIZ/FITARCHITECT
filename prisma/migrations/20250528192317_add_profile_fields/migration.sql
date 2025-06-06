-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "daysPerWeek" INTEGER,
ADD COLUMN     "equipmentPreferences" TEXT[],
ADD COLUMN     "experienceLevel" TEXT,
ADD COLUMN     "preferredWorkoutDuration" INTEGER;
