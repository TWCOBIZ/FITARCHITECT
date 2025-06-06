/*
  Warnings:

  - You are about to drop the column `completed` on the `WorkoutPlan` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `WorkoutPlan` table. All the data in the column will be lost.
  - You are about to drop the column `difficulty` on the `WorkoutPlan` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `WorkoutPlan` table. All the data in the column will be lost.
  - You are about to drop the column `isDefault` on the `WorkoutPlan` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `WorkoutPlan` table. All the data in the column will be lost.
  - You are about to drop the column `targetMuscleGroups` on the `WorkoutPlan` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `WorkoutPlan` table. All the data in the column will be lost.
  - You are about to drop the column `workouts` on the `WorkoutPlan` table. All the data in the column will be lost.
  - You are about to drop the `WorkoutLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_profiles` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `plan` to the `WorkoutPlan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "NutritionLog" DROP CONSTRAINT "NutritionLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "ParqResponse" DROP CONSTRAINT "ParqResponse_userId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutLog" DROP CONSTRAINT "WorkoutLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutPlan" DROP CONSTRAINT "WorkoutPlan_userId_fkey";

-- AlterTable
ALTER TABLE "WorkoutPlan" DROP COLUMN "completed",
DROP COLUMN "description",
DROP COLUMN "difficulty",
DROP COLUMN "duration",
DROP COLUMN "isDefault",
DROP COLUMN "name",
DROP COLUMN "targetMuscleGroups",
DROP COLUMN "updatedAt",
DROP COLUMN "workouts",
ADD COLUMN     "plan" JSONB NOT NULL;

-- DropTable
DROP TABLE "WorkoutLog";

-- DropTable
DROP TABLE "user_profiles";

-- AddForeignKey
ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionLog" ADD CONSTRAINT "NutritionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParqResponse" ADD CONSTRAINT "ParqResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
