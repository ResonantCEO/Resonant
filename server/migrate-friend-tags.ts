
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrateFriendTags() {
  try {
    console.log("Adding friend_tags columns to photos and photo_comments tables...");
    
    // Add friend_tags column to photos table
    await db.execute(sql`
      ALTER TABLE photos 
      ADD COLUMN IF NOT EXISTS friend_tags INTEGER[] DEFAULT '{}' NOT NULL
    `);
    
    console.log("Successfully added friend_tags column to photos table");
    
    // Add friend_tags column to photo_comments table
    await db.execute(sql`
      ALTER TABLE photo_comments 
      ADD COLUMN IF NOT EXISTS friend_tags INTEGER[] DEFAULT '{}' NOT NULL
    `);
    
    console.log("Successfully added friend_tags column to photo_comments table");
    console.log("Friend tags migration completed successfully!");
    
  } catch (error) {
    console.error("Error in friend tags migration:", error);
    throw error;
  }
}

// Run the migration
migrateFriendTags()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
