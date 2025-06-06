const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function importParqResponses() {
  const data = JSON.parse(fs.readFileSync('parq_responses_backup.json', 'utf-8'));
  for (const row of data) {
    const user = await prisma.user.findUnique({ where: { id: row.userid } });
    if (!user) {
      console.warn(`Skipping ParqResponse for missing userId: ${row.userid}`);
      continue;
    }
    await prisma.parqResponse.create({
      data: {
        id: row.id,
        userId: row.userid,
        answers: row.answers,
        flagged: row.flagged,
        flaggedQuestions: row.flaggedquestions,
        notes: row.notes,
        reviewed: row.reviewed,
        reviewedBy: row.reviewedby,
        createdAt: row.createdat,
        updatedAt: row.updatedat,
      }
    });
    console.log(`Imported ParqResponse for userId ${row.userid}`);
  }
  await prisma.$disconnect();
}

importParqResponses(); 