const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function importNutritionLogs() {
  const data = JSON.parse(fs.readFileSync('nutrition_logs_backup.json', 'utf-8'));
  for (const row of data) {
    const user = await prisma.user.findUnique({ where: { id: row.userid } });
    if (!user) {
      console.warn(`Skipping NutritionLog for missing userId: ${row.userid}`);
      continue;
    }
    await prisma.nutritionLog.create({
      data: {
        id: row.id,
        userId: row.userid,
        date: row.date,
        foods: row.foods,
        calories: row.calories,
        notes: row.notes,
        macros: row.macros,
      }
    });
    console.log(`Imported NutritionLog for userId ${row.userid}`);
  }
  await prisma.$disconnect();
}

importNutritionLogs(); 