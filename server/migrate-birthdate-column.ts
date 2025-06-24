
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrateBirthdateColumn() {
  try {
    console.log("Adding birthdate column to users table...");
    
    // Add the birthdate column to the users table
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS birthdate TIMESTAMP
    `);
    
    console.log("Successfully added birthdate column to users table");
    console.log("Birthdate column migration completed successfully!");
    
  } catch (error) {
    console.error("Error in birthdate column migration:", error);
    throw error;
  }
}

// Run the migration
migrateBirthdateColumn()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
