
import { db } from "./db.js";

async function createDiscoverIndexes() {
  try {
    console.log("Creating indexes for discover page optimization...");

    // Index for profiles visibility and type filtering
    await db.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_discover 
      ON profiles (visibility, type, "deletedAt") 
      WHERE visibility = 'public' AND "deletedAt" IS NULL
    `);

    // Index for profiles search
    await db.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_search_name 
      ON profiles USING gin(to_tsvector('english', name))
      WHERE visibility = 'public' AND "deletedAt" IS NULL
    `);

    // Index for profiles location search
    await db.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_location 
      ON profiles (location) 
      WHERE visibility = 'public' AND "deletedAt" IS NULL AND location IS NOT NULL
    `);

    // Index for profiles genre search
    await db.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_genre 
      ON profiles (genre) 
      WHERE visibility = 'public' AND "deletedAt" IS NULL AND genre IS NOT NULL
    `);

    // Index for events discover
    await db.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_discover 
      ON events (status, "eventDate") 
      WHERE status = 'published' AND "eventDate" >= NOW()
    `);

    // Index for events search
    await db.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_search 
      ON events USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(genre, '')))
      WHERE status = 'published'
    `);

    console.log("✅ All discover indexes created successfully");
  } catch (error) {
    console.error("Error creating discover indexes:", error);
  } finally {
    process.exit(0);
  }
}

createDiscoverIndexes();
