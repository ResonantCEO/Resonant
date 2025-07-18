
import { db } from './db';
import { bookingRequests, notifications, contractProposals, contractNegotiations, contractSignatures, events, calendarEvents } from '../shared/schema';
import { eq, or, sql, like } from 'drizzle-orm';

async function clearAllBookingData() {
  console.log('=== COMPREHENSIVE BOOKING DATA CLEANUP ===');

  try {
    // First, let's see what we're working with
    const currentBookings = await db.select().from(bookingRequests);
    console.log(`Found ${currentBookings.length} booking requests to delete`);

    // Delete ALL notifications first (to be completely sure)
    console.log('1. Clearing ALL notifications...');
    await db.delete(notifications);
    console.log('   - Cleared all notifications');

    // Delete contract signatures
    console.log('2. Clearing contract signatures...');
    await db.delete(contractSignatures);
    console.log('   - Cleared all contract signatures');

    // Delete contract negotiations  
    console.log('3. Clearing contract negotiations...');
    await db.delete(contractNegotiations);
    console.log('   - Cleared all contract negotiations');

    // Delete contract proposals
    console.log('4. Clearing contract proposals...');
    await db.delete(contractProposals);
    console.log('   - Cleared all contract proposals');

    // Delete booking-related events
    console.log('5. Clearing booking-related events...');
    await db.delete(events).where(sql`booking_request_id IS NOT NULL`);
    console.log('   - Cleared booking-related events');

    // Delete booking-related calendar events
    console.log('6. Clearing booking-related calendar events...');
    await db.delete(calendarEvents).where(eq(calendarEvents.type, 'booking'));
    console.log('   - Cleared booking calendar events');

    // Delete all booking requests
    console.log('7. Clearing all booking requests...');
    const deleteResult = await db.delete(bookingRequests);
    console.log(`   - Deleted all booking requests`);

    // Verify cleanup
    const remainingBookings = await db.select().from(bookingRequests);
    const remainingNotifications = await db.select().from(notifications);
    
    console.log('\n=== CLEANUP VERIFICATION ===');
    console.log(`📋 Booking requests remaining: ${remainingBookings.length}`);
    console.log(`🔔 Notifications remaining: ${remainingNotifications.length}`);

    if (remainingBookings.length === 0 && remainingNotifications.length === 0) {
      console.log('✅ SUCCESS: All booking data has been completely cleared!');
    } else {
      console.log('⚠️  WARNING: Some data may still remain');
    }

    console.log('\n🔄 Please refresh your browser to see the changes.');
    console.log('💡 If the frontend still shows cached data, hard refresh with Ctrl+F5');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during comprehensive cleanup:', error);
    process.exit(1);
  }
}

clearAllBookingData();
