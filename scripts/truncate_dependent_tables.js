const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function truncateTables() {
  await client.connect();
  await client.query('TRUNCATE TABLE "ParqResponse" CASCADE');
  await client.query('TRUNCATE TABLE "NutritionLog" CASCADE');
  console.log('Truncated ParqResponse and NutritionLog tables.');
  await client.end();
}

truncateTables(); 