
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrateBookingColumns() {
  try {
    console.log("Adding missing columns to booking_requests table...");
    
    // Add event_date column
    await db.execute(sql`
      ALTER TABLE booking_requests 
      ADD COLUMN IF NOT EXISTS event_date DATE
    `);
    
    // Add event_time column
    await db.execute(sql`
      ALTER TABLE booking_requests 
      ADD COLUMN IF NOT EXISTS event_time TIME
    `);
    
    // Add budget column
    await db.execute(sql`
      ALTER TABLE booking_requests 
      ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2)
    `);
    
    // Add requirements column
    await db.execute(sql`
      ALTER TABLE booking_requests 
      ADD COLUMN IF NOT EXISTS requirements TEXT
    `);
    
    // Add message column
    await db.execute(sql`
      ALTER TABLE booking_requests 
      ADD COLUMN IF NOT EXISTS message TEXT
    `);
    
    console.log("Successfully added all missing columns to booking_requests table");
    console.log("Booking columns migration completed successfully!");
    
  } catch (error) {
    console.error("Error in booking columns migration:", error);
    throw error;
  }
}

// Run the migration
migrateBookingColumns()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
