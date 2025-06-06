const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function exportNutritionLogs() {
  await client.connect();
  const res = await client.query('SELECT * FROM "NutritionLog"');
  fs.writeFileSync('nutrition_logs_backup.json', JSON.stringify(res.rows, null, 2));
  console.log(`Exported ${res.rows.length} NutritionLog rows to nutrition_logs_backup.json`);
  await client.end();
}

exportNutritionLogs(); 