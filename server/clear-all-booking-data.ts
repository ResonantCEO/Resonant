
import { db } from './db';
import { bookingRequests, notifications, contractProposals, contractNegotiations, contractSignatures } from '../shared/schema';
import { eq, or, sql } from 'drizzle-orm';

async function clearAllBookingData() {
  console.log('=== COMPREHENSIVE BOOKING DATA CLEANUP ===');

  try {
    // Delete all booking-related notifications (including any variations)
    console.log('1. Clearing all booking-related notifications...');
    
    const bookingNotificationTypes = [
      'booking_request',
      'booking_accepted', 
      'booking_declined',
      'booking_confirmed',
      'booking_response'
    ];

    for (const type of bookingNotificationTypes) {
      const result = await db.delete(notifications).where(eq(notifications.type, type));
      console.log(`   - Cleared ${type} notifications`);
    }

    // Also clear any notifications that might have booking data
    const notificationsWithBookingData = await db.delete(notifications).where(
      or(
        sql`${notifications.data}::text LIKE '%booking%'`,
        sql`${notifications.data}::text LIKE '%venue%'`,
        sql`${notifications.message} LIKE '%booking%'`,
        sql`${notifications.title} LIKE '%Booking%'`
      )
    );
    console.log('   - Cleared notifications with booking-related data');

    // Delete contract signatures
    console.log('2. Clearing contract signatures...');
    await db.delete(contractSignatures);

    // Delete contract negotiations  
    console.log('3. Clearing contract negotiations...');
    await db.delete(contractNegotiations);

    // Delete contract proposals
    console.log('4. Clearing contract proposals...');
    await db.delete(contractProposals);

    // Delete all booking requests
    console.log('5. Clearing all booking requests...');
    await db.delete(bookingRequests);

    console.log('✅ Successfully cleared ALL booking-related data from the database.');
    console.log('✅ Database is now completely clean of booking data.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during comprehensive cleanup:', error);
    process.exit(1);
  }
}

clearAllBookingData();
