const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,                      // allow up to 20 concurrent connections (default was 10)
  idleTimeoutMillis: 30000,     // close idle connections after 30s
  connectionTimeoutMillis: 5000, // fail fast if pool is exhausted
});

async function initDB() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(schema);
  console.log('Database schema initialized');
}

module.exports = { pool, initDB };
