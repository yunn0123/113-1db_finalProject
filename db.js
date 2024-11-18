const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'finalPJ',
  password: 'password',
  port: 5432, // 預設 PostgreSQL 埠
});

module.exports = pool;
