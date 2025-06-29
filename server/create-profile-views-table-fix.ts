
import { db } from "./db";
import { sql } from "drizzle-orm";

async function createProfileViewsTable() {
  try {
    console.log("Creating profile_views table...");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS profile_views (
        id SERIAL PRIMARY KEY,
        viewer_id INTEGER NOT NULL,
        viewer_profile_id INTEGER NOT NULL,
        viewed_profile_id INTEGER NOT NULL,
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        viewed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_profile_views_viewer 
      ON profile_views(viewer_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_profile_views_viewed 
      ON profile_views(viewed_profile_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_profile_views_session 
      ON profile_views(session_id);
    `);

    console.log("Profile views table created successfully!");
  } catch (error) {
    console.error("Error creating profile_views table:", error);
  }
}

createProfileViewsTable();
