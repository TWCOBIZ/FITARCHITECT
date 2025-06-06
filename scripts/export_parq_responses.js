const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function exportParqResponses() {
  await client.connect();
  const res = await client.query('SELECT * FROM "ParqResponse"');
  fs.writeFileSync('parq_responses_backup.json', JSON.stringify(res.rows, null, 2));
  console.log(`Exported ${res.rows.length} ParqResponse rows to parq_responses_backup.json`);
  await client.end();
}

exportParqResponses(); 