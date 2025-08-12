/*
  Warnings:

  - The `preferredWorkoutDuration` column on the `user_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "preferredWorkoutDuration",
ADD COLUMN     "preferredWorkoutDuration" INTEGER;
