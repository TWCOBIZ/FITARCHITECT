-- CreateTable
CREATE TABLE "ParqResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flaggedQuestions" TEXT[],
    "notes" TEXT[],
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParqResponse_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ParqResponse" ADD CONSTRAINT "ParqResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
