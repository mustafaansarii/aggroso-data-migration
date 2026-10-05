import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL as string,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL environment variable is missing.");
}

async function initDb() {
  // Initialize app metadata schema
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migration_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      version INT NOT NULL,
      status VARCHAR(50) NOT NULL,
      mapping_json TEXT NOT NULL,
      approver VARCHAR(255),
      approved_at DATETIME
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS runs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plan_id INT,
      type VARCHAR(50),
      status VARCHAR(50),
      source_count INT,
      accepted_count INT,
      rejected_count INT,
      skipped_duplicates INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quarantine (
      id INT AUTO_INCREMENT PRIMARY KEY,
      run_id INT,
      source_key VARCHAR(255),
      raw_record TEXT,
      errors TEXT
    )
  `);

  // Initialize target mock schema
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      account_id VARCHAR(255) PRIMARY KEY,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(255),
      status VARCHAR(50),
      created_at VARCHAR(100)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS migration_lineage (
      record_key VARCHAR(255) PRIMARY KEY,
      account_id VARCHAR(255),
      run_id INT
    )
  `);
}

// Fire and forget initialization
initDb().catch(console.error);

export { pool as db };
