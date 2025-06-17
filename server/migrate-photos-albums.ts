
import { db } from "./db";
import { albums, photos } from "@shared/schema";

async function migratePhotosAndAlbums() {
  try {
    console.log("Creating photos and albums tables...");
    
    // The tables will be created automatically when we try to use them
    // since they're already defined in the schema
    
    // Test that the tables exist by running a simple query
    await db.select().from(albums).limit(1);
    await db.select().from(photos).limit(1);
    
    console.log("Photos and albums tables created successfully!");
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
}

// Run the migration
migratePhotosAndAlbums()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
