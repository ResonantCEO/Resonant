
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrateHometownZipcode() {
  try {
    console.log("Adding hometown column to users table...");
    
    // Add the hometown column to the users table if it doesn't exist
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS hometown VARCHAR
    `);
    
    console.log("Successfully added hometown column to users table");
    console.log("Hometown zipcode migration completed successfully!");
    
  } catch (error) {
    console.error("Error in hometown zipcode migration:", error);
    throw error;
  }
}

// Run the migration
migrateHometownZipcode()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
