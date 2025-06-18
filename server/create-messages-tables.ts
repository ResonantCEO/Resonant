
import { db } from "./db";
import { sql } from "drizzle-orm";

async function createMessagesTables() {
  try {
    console.log("Creating messages tables...");

    // Create conversations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        type VARCHAR NOT NULL DEFAULT 'direct',
        name VARCHAR,
        description TEXT,
        image_url VARCHAR,
        created_by INTEGER REFERENCES profiles(id),
        is_archived BOOLEAN DEFAULT false,
        last_message_id INTEGER,
        last_activity_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create conversation_participants table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        role VARCHAR DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT NOW(),
        left_at TIMESTAMP,
        last_read_at TIMESTAMP DEFAULT NOW(),
        is_muted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create messages table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        reply_to_id INTEGER REFERENCES messages(id),
        content TEXT NOT NULL,
        message_type VARCHAR DEFAULT 'text',
        attachments JSONB DEFAULT '[]',
        reactions JSONB DEFAULT '{}',
        edited_at TIMESTAMP,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create message_reads table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS message_reads (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        read_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add foreign key constraint for last_message_id
    await db.execute(sql`
      ALTER TABLE conversations 
      ADD CONSTRAINT fk_conversations_last_message 
      FOREIGN KEY (last_message_id) REFERENCES messages(id)
    `);

    // Add new columns to existing tables
    await db.execute(sql`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false
    `);

    await db.execute(sql`
      ALTER TABLE conversation_participants 
      ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false
    `);

    // Create profile_blocks table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS profile_blocks (
        id SERIAL PRIMARY KEY,
        blocker_profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        blocked_profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(blocker_profile_id, blocked_profile_id)
      )
    `);

    // Create profile_reports table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS profile_reports (
        id SERIAL PRIMARY KEY,
        reporter_profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        reported_profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        status VARCHAR DEFAULT 'pending',
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_conversation_participants_profile_id ON conversation_participants(profile_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON message_reads(message_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_message_reads_profile_id ON message_reads(profile_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_profile_blocks_blocker ON profile_blocks(blocker_profile_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_profile_blocks_blocked ON profile_blocks(blocked_profile_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_profile_reports_reporter ON profile_reports(reporter_profile_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_profile_reports_reported ON profile_reports(reported_profile_id)
    `);

    console.log("Messages tables created successfully!");
  } catch (error) {
    console.error("Error creating messages tables:", error);
    throw error;
  }
}

if (require.main === module) {
  createMessagesTables().then(() => {
    console.log("Migration completed");
    process.exit(0);
  }).catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
}

export { createMessagesTables };
