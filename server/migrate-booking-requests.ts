
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrateBookingRequests() {
  try {
    console.log("Adding new columns to booking_requests table...");
    
    // Add new columns
    await db.execute(sql`
      ALTER TABLE booking_requests 
      ADD COLUMN IF NOT EXISTS event_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS event_time VARCHAR,
      ADD COLUMN IF NOT EXISTS budget REAL,
      ADD COLUMN IF NOT EXISTS requirements TEXT,
      ADD COLUMN IF NOT EXISTS message TEXT
    `);
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateBookingRequests().then(() => process.exit(0));
}

export { migrateBookingRequests };
