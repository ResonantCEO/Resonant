
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
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migratePhotoComments() {
  try {
    console.log("Adding comments_count column to photos table...");
    
    // Add comments_count column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE photos 
      ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0
    `);
    
    console.log("Successfully added comments_count column to photos table");
    
    // Update existing photos to have correct comment counts
    console.log("Updating comment counts for existing photos...");
    
    await db.execute(sql`
      UPDATE photos 
      SET comments_count = (
        SELECT COUNT(*) 
        FROM photo_comments 
        WHERE photo_comments.photo_id = photos.id
      )
    `);
    
    console.log("Updated comment counts for existing photos");
    console.log("Photo comments migration completed successfully!");
    
  } catch (error) {
    console.error("Error in photo comments migration:", error);
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
