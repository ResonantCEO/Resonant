
import { db } from './db';

async function addRespondedAtColumn() {
  console.log('Adding respondedAt column to booking_requests table...');

  try {
    await db.execute(`
      ALTER TABLE booking_requests 
      ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP;
    `);
    
    console.log('Successfully added respondedAt column to booking_requests table');
    console.log('Booking respondedAt migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding respondedAt column:', error);
    process.exit(1);
  }
}

addRespondedAtColumn();
