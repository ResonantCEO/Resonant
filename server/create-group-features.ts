
import { db } from "./db";
import { sql } from "drizzle-orm";

async function addGroupFeatures() {
  try {
    console.log("Adding group conversation features...");

    // Add new columns to conversations table
    await db.execute(sql`
      ALTER TABLE conversations 
      ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 50,
      ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
    `);

    // Update existing conversations to have default settings
    await db.execute(sql`
      UPDATE conversations 
      SET settings = '{
        "canMembersInvite": true,
        "canMembersLeave": true,
        "adminOnlyMessages": false
      }'::jsonb
      WHERE settings IS NULL OR settings = '{}'::jsonb;
    `);

    console.log("Group features added successfully!");
  } catch (error) {
    console.error("Error adding group features:", error);
    throw error;
  }
}

// Run the migration
addGroupFeatures()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
