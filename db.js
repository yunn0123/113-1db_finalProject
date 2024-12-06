const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'db_proj',
  password: '0000',
  port: 5432, // 預設 PostgreSQL 埠
});

module.exports = pool;
