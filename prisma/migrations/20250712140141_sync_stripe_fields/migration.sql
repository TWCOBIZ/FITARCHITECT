/*
  Warnings:

  - You are about to drop the column `date` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `workouts` on the `WorkoutPlan` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Made the column `weeks` on table `WorkoutPlan` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_subscriptionId_fkey";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "date",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'usd',
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "subscriptionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WorkoutPlan" DROP COLUMN "workouts",
ALTER COLUMN "weeks" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "hasPaymentMethod" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionEndDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionStartDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionTier" TEXT NOT NULL DEFAULT 'free';

-- CreateTable
CREATE TABLE "Recipe" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "prepTime" INTEGER NOT NULL,
    "cookTime" INTEGER NOT NULL DEFAULT 0,
    "servings" INTEGER NOT NULL DEFAULT 4,
    "ingredients" JSONB NOT NULL,
    "instructions" JSONB NOT NULL,
    "nutrition" JSONB,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
