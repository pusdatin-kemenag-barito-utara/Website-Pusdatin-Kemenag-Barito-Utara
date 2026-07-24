const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

client.connect().then(() => {
  client.query("SELECT * FROM kemenag_pusdatin.audit_logs ORDER BY timestamp DESC LIMIT 5", (err, res) => {
    if (err) throw err;
    console.log(res.rows);
    client.end();
  });
});
