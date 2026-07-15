// db/init.js
// One-time setup script: creates the database (if missing) and the signups table.
// Run with: npm run init-db
require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'ironforge_gym';

async function init() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Study$1234',
    multipleStatements: true,
  });

  try {
    console.log(`Creating database "${DB_NAME}" if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${DB_NAME}\`;`);

    console.log('Creating "signups" table if it doesn\'t exist...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS signups (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        first_name    VARCHAR(100)  NOT NULL,
        last_name     VARCHAR(100)  NOT NULL,
        email         VARCHAR(255)  NOT NULL,
        phone         VARCHAR(30)   NULL,
        plan          VARCHAR(50)   NOT NULL,
        goal          VARCHAR(100)  NOT NULL,
        experience    VARCHAR(50)   NOT NULL,
        message       TEXT          NULL,
        agreed_terms  TINYINT(1)    NOT NULL DEFAULT 0,
        created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Database and table are ready.');
  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

init();
