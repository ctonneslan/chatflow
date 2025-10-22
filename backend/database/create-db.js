/**
 * @fileoverview Database creation script for ChatFlow.
 * Creates the chatflow database if it doesn't exist.
 * @module database/create-db
 */

import { Pool } from "pg";

// Connect to the default 'postgres' database to create our chatflow database
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL?.replace("/chatflow", "/postgres") ||
    "postgresql://localhost/postgres",
});

/**
 * Create the chatflow database if it doesn't already exist.
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If database creation fails
 */
async function createDatabase() {
  try {
    console.log("🔨 Creating chatflow database...");

    // Check if database exists
    const result = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'chatflow'"
    );

    if (result.rows.length > 0) {
      console.log("✅ Database 'chatflow' already exists");
    } else {
      await pool.query("CREATE DATABASE chatflow");
      console.log("✅ Database 'chatflow' created successfully");
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating database:", error.message);
    await pool.end();
    process.exit(1);
  }
}

createDatabase();
