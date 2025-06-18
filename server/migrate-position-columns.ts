
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migratePositionColumns() {
  try {
    console.log("Adding position columns to profiles table...");
    
    // Add the missing position columns
    await db.execute(sql`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS cover_position_x REAL DEFAULT 50,
      ADD COLUMN IF NOT EXISTS cover_position_y REAL DEFAULT 50,
      ADD COLUMN IF NOT EXISTS profile_position_x REAL DEFAULT 50,
      ADD COLUMN IF NOT EXISTS profile_position_y REAL DEFAULT 50
    `);
    
    console.log("Position columns migration completed successfully!");
  } catch (error) {
    console.error("Error migrating position columns:", error);
    throw error;
  }
}

// Run the migration
migratePositionColumns()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
