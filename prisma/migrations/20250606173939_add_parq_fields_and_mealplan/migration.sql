-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "equipmentAvailability" TEXT,
ADD COLUMN     "healthConditions" TEXT,
ADD COLUMN     "injuryHistory" TEXT,
ADD COLUMN     "legalAcknowledgment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferredWorkoutDuration" TEXT;

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "dietType" TEXT NOT NULL,
    "meals" JSONB NOT NULL,
    "shoppingList" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
