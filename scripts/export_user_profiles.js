const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function exportUserProfiles() {
  await client.connect();
  const res = await client.query('SELECT * FROM user_profiles');
  fs.writeFileSync('user_profiles_backup.json', JSON.stringify(res.rows, null, 2));
  console.log(`Exported ${res.rows.length} user profiles to user_profiles_backup.json`);
  await client.end();
}

exportUserProfiles(); 