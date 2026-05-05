const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { DEFAULT_THRESHOLDS, POLES, INIT_ALERTS } = require("./seedData");

let pool = null;
const DB_NAME = process.env.MYSQL_DATABASE || "earthing";

async function initializeDatabase() {
  // First connection without database to create it if needed
  const tempConn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "Sadhaabdul@991",
  });

  try {
    await tempConn.execute(`CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✓ Database '${DB_NAME}' ready`);
  } finally {
    await tempConn.end();
  }

  // Now create pool with database selected
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "Sadhaabdul@991",
    database: DB_NAME,
    connectionLimit: 10,
    waitForConnections: true,
    multipleStatements: true,
  });

  return pool;
}

async function ensureSchemaAndSeed() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schemaSql);

  const [poleCountRows] = await pool.query("SELECT COUNT(*) AS count FROM poles");
  if (poleCountRows[0].count === 0) {
    for (const p of POLES) {
      await pool.query(
        `INSERT INTO poles (id, area, status, leakage, resistance, continuity, voltage, moisture, temp, last_check, cause, history_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [p.id, p.area, p.status, p.leakage, p.resistance, p.continuity, p.voltage, p.moisture, p.temp, p.lastCheck, p.cause, JSON.stringify(p.history || [])]
      );
    }
  }

  const [alertCountRows] = await pool.query("SELECT COUNT(*) AS count FROM alerts");
  if (alertCountRows[0].count === 0) {
    for (const a of INIT_ALERTS) {
      await pool.query(
        `INSERT INTO alerts (id, pole_id, fault, severity, time, date, status, tech, notes, material, image, completed_at, priority)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [a.id, a.pole, a.fault, a.severity, a.time, a.date, a.status, a.tech || "", a.notes || "", a.material || "", a.image || null, a.completedAt || null, a.priority || 3]
      );
    }
  }

  await pool.query(
    `INSERT INTO settings (setting_key, setting_value)
     VALUES ('thresholds', ?)
     ON DUPLICATE KEY UPDATE setting_value = setting_value`,
    [JSON.stringify(DEFAULT_THRESHOLDS)]
  );
}

function getPool() {
  if (!pool) {
    throw new Error("Database pool not initialized. Call initializeDatabase first.");
  }
  return pool;
}

module.exports = {
  initializeDatabase,
  getPool,
  ensureSchemaAndSeed,
};
