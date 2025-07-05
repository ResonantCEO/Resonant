
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrateCalendarEvents() {
  console.log('Creating calendar_events table...');

  try {
    // Create calendar_events table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        title VARCHAR NOT NULL,
        date TIMESTAMP NOT NULL,
        start_time VARCHAR NOT NULL,
        end_time VARCHAR,
        type VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'confirmed',
        client VARCHAR,
        location VARCHAR,
        notes TEXT,
        budget REAL,
        is_private BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index on profile_id and date for faster queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_profile_date 
      ON calendar_events (profile_id, date);
    `);

    console.log('✅ Calendar events table created successfully!');

  } catch (error) {
    console.error('❌ Error creating calendar events table:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateCalendarEvents()
    .then(() => {
      console.log('Calendar events migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Calendar events migration failed:', error);
      process.exit(1);
    });
}

export { migrateCalendarEvents };
