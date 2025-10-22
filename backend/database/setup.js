/**
 * @fileoverview Database schema setup script for ChatFlow.
 * @module database/setup
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost/chatflow",
});

/**
 * Setup database schema by executing SQL from schema.sql file.
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If schema file cannot be read or SQL execution fails
 */
async function setupDatabase() {
  try {
    console.log(`📦 Setting up database schema...`);
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    await pool.query(schema);

    console.log("✅ Database schema created successfully");

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up database:", error);
    await pool.end();
    process.exit(1);
  }
}

setupDatabase();
