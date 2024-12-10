const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: database_name, // 自行輸入本地端資料庫名稱
  password: password, // 自行輸入本地端資料庫密碼
  port: 5432, // 預設 PostgreSQL 埠
});

module.exports = pool;
