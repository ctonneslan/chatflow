/**
 * @fileoverview Database reset script for ChatFlow.
 * Drops all tables from the database in the correct order to handle foreign key constraints.
 * @module database/reset
 * @warning This script will delete ALL data in the database. Use with extreme caution!
 */

import { Pool } from "pg";

/**
 * PostgreSQL connection pool configured to connect to the ChatFlow database
 * @type {Pool}
 */
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost/chatflow",
});

/**
 * Resets the database by dropping all tables in the correct order.
 * Tables are dropped in reverse dependency order to avoid foreign key constraint violations:
 * 1. messages (depends on rooms and users)
 * 2. room_members (depends on rooms and users)
 * 3. rooms (depends on users)
 * 4. users (base table)
 *
 * @async
 * @function resetDatabase
 * @returns {Promise<void>} Exits process with code 0 on success, 1 on failure
 * @throws {Error} If database operations fail
 *
 * @example
 * // Run this script from the command line
 * node backend/database/reset.js
 */
async function resetDatabase() {
  try {
    console.log("🗑️  Dropping all tables...");

    // Drop tables in reverse dependency order
    // CASCADE ensures dependent objects are also dropped
    await pool.query(`
      DROP TABLE IF EXISTS messages CASCADE;
      DROP TABLE IF EXISTS room_members CASCADE;
      DROP TABLE IF EXISTS rooms CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    console.log("✅ All tables dropped successfully");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    await pool.end();
    process.exit(1);
  }
}

// Execute the reset operation
resetDatabase();
