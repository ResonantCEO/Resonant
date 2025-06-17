
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migratePhotoComments() {
  try {
    console.log("Creating photo_comments table and adding commentsCount to photos...");
    
    // Add commentsCount column to photos table
    await db.execute(sql`
      ALTER TABLE photos 
      ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0
    `);
    
    // Create photo_comments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS photo_comments (
        id SERIAL PRIMARY KEY,
        photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_photo_comments_photo_id ON photo_comments(photo_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_photo_comments_profile_id ON photo_comments(profile_id)
    `);
    
    console.log("Photo comments migration completed successfully!");
  } catch (error) {
    console.error("Error migrating photo comments:", error);
    throw error;
  }
}

// Run the migration
migratePhotoComments()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
