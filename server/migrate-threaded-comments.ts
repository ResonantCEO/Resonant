
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrateThreadedComments() {
  try {
    console.log("Adding threaded comments support...");
    
    // Add parentId and repliesCount columns to photo_comments table
    await db.execute(sql`
      ALTER TABLE photo_comments 
      ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES photo_comments(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS replies_count INTEGER DEFAULT 0
    `);
    
    // Create index for better performance on parent_id queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_photo_comments_parent_id ON photo_comments(parent_id)
    `);
    
    console.log("Threaded comments migration completed successfully!");
  } catch (error) {
    console.error("Error migrating threaded comments:", error);
    throw error;
  }
}

// Run the migration
migrateThreadedComments()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
