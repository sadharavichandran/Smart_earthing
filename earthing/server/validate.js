#!/usr/bin/env node
/**
 * Quick validation script to check system readiness
 * Run with: node server/validate.js
 */

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function validate() {
  console.log("\n=== EarthGuard System Validation ===\n");

  let allOk = true;

  // 1. Check .env file
  console.log("✓ Checking .env configuration...");
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.error("✗ .env file not found! Copy .env.example to .env and configure it.");
    allOk = false;
  } else {
    require("dotenv").config();
    console.log("  ✓ .env loaded");
  }

  // 2. Check MySQL connectivity
  console.log("✓ Testing MySQL connection...");
  try {
    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || "localhost",
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "earthing",
    });
    console.log("  ✓ Connected to MySQL");
    await conn.end();
  } catch (err) {
    console.error(`✗ MySQL connection failed: ${err.message}`);
    console.error("  Ensure MySQL is running and credentials in .env are correct.");
    allOk = false;
  }

  // 3. Check required files
  console.log("✓ Checking required files...");
  const requiredFiles = [
    "server/index.js",
    "server/db.js",
    "server/seedData.js",
    "server/schema.sql",
    "src/App.js",
    "src/index.js",
  ];
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, "..", file);
    if (!fs.existsSync(filePath)) {
      console.error(`✗ Missing: ${file}`);
      allOk = false;
    }
  }
  if (allOk) {
    console.log("  ✓ All required files present");
  }

  // 4. Check dependencies
  console.log("✓ Checking npm dependencies...");
  const packageJsonPath = path.join(__dirname, "..", "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    console.error("✗ package.json not found!");
    allOk = false;
  } else {
    const nodeModules = path.join(__dirname, "..", "node_modules");
    if (!fs.existsSync(nodeModules)) {
      console.error("✗ node_modules not found! Run: npm install");
      allOk = false;
    } else {
      console.log("  ✓ Dependencies installed");
    }
  }

  console.log("\n=== Validation Complete ===\n");
  if (allOk) {
    console.log("✅ All checks passed! You can run:\n  npm run dev\n");
    process.exit(0);
  } else {
    console.log("❌ Some checks failed. Please fix the issues above and try again.\n");
    process.exit(1);
  }
}

validate().catch((err) => {
  console.error("Validation error:", err);
  process.exit(1);
});
