
import { db } from "./db";
import { sql } from "drizzle-orm";

async function createProfileViewsTable() {
  try {
    console.log("Creating profile_views table...");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS profile_views (
        id SERIAL PRIMARY KEY,
        viewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        viewer_profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        viewed_profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        viewed_at TIMESTAMP DEFAULT NOW() NOT NULL,
        session_id VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        UNIQUE(viewer_id, viewer_profile_id, viewed_profile_id, DATE(viewed_at))
      )
    `);

    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_profile_views_viewer 
      ON profile_views(viewer_id, viewer_profile_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_profile 
      ON profile_views(viewed_profile_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at 
      ON profile_views(viewed_at)
    `);

    console.log("Profile views table created successfully!");
  } catch (error) {
    console.error("Error creating profile views table:", error);
  }
}

// Run the migration
createProfileViewsTable();
