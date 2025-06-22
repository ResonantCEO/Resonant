
import { db } from './db';
import { sql } from 'drizzle-orm';

async function createContractTables() {
  try {
    console.log('Creating contract proposals table...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS contract_proposals (
        id SERIAL PRIMARY KEY,
        booking_request_id INTEGER NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
        proposed_by INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        proposed_to INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        title VARCHAR NOT NULL,
        description TEXT,
        terms JSONB NOT NULL,
        payment JSONB NOT NULL,
        requirements TEXT,
        attachments JSONB DEFAULT '[]',
        status VARCHAR NOT NULL DEFAULT 'pending',
        expires_at TIMESTAMP,
        accepted_at TIMESTAMP,
        rejected_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Creating contract negotiations table...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS contract_negotiations (
        id SERIAL PRIMARY KEY,
        contract_proposal_id INTEGER NOT NULL REFERENCES contract_proposals(id) ON DELETE CASCADE,
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        proposed_changes JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Creating contract signatures table...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS contract_signatures (
        id SERIAL PRIMARY KEY,
        contract_proposal_id INTEGER NOT NULL REFERENCES contract_proposals(id) ON DELETE CASCADE,
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        signed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        signature_data TEXT,
        ip_address VARCHAR,
        user_agent TEXT
      )
    `);

    console.log('Contract tables created successfully!');
    
  } catch (error) {
    console.error('Error creating contract tables:', error);
    throw error;
  }
}

// Run the migration
createContractTables()
  .then(() => {
    console.log('Contract migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Contract migration failed:', error);
    process.exit(1);
  });
