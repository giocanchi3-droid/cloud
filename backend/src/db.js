const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.POSTGRES_DB || 'stock_zapatos',
  user: process.env.POSTGRES_USER || 'stock_admin',
  password: process.env.POSTGRES_PASSWORD || 'stock_password',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (error) => {
  console.error('Error inesperado en PostgreSQL:', error);
});

async function verifyDatabase() {
  const result = await pool.query('SELECT NOW() AS current_time');
  return result.rows[0];
}

module.exports = { pool, verifyDatabase };