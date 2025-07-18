
import { db } from './db';
import { bookingRequests, notifications } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function clearAllBookingData() {
  console.log('=== ROBUST BOOKING DATA CLEANUP ===');

  try {
    // First check what tables actually exist
    console.log('1. Checking existing tables...');
    const existingTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const tableNames = existingTables.map(t => t.table_name);
    console.log('   Found tables:', tableNames);

    // Clear all notifications (already working)
    console.log('2. Clearing ALL notifications...');
    await db.delete(notifications);
    console.log('   ✅ Cleared all notifications');

    // Clear contract-related tables if they exist
    if (tableNames.includes('contract_signatures')) {
      console.log('3. Clearing contract signatures...');
      await db.execute(sql`DELETE FROM contract_signatures`);
      console.log('   ✅ Cleared contract signatures');
    } else {
      console.log('3. ⚠️  contract_signatures table does not exist - skipping');
    }

    if (tableNames.includes('contract_negotiations')) {
      console.log('4. Clearing contract negotiations...');
      await db.execute(sql`DELETE FROM contract_negotiations`);
      console.log('   ✅ Cleared contract negotiations');
    } else {
      console.log('4. ⚠️  contract_negotiations table does not exist - skipping');
    }

    if (tableNames.includes('contract_proposals')) {
      console.log('5. Clearing contract proposals...');
      await db.execute(sql`DELETE FROM contract_proposals`);
      console.log('   ✅ Cleared contract proposals');
    } else {
      console.log('5. ⚠️  contract_proposals table does not exist - skipping');
    }

    // Clear events that reference booking requests
    if (tableNames.includes('events')) {
      console.log('6. Clearing booking-related events...');
      await db.execute(sql`DELETE FROM events WHERE booking_request_id IS NOT NULL`);
      console.log('   ✅ Cleared booking-related events');
    } else {
      console.log('6. ⚠️  events table does not exist - skipping');
    }

    // Clear calendar events
    if (tableNames.includes('calendar_events')) {
      console.log('7. Clearing booking calendar events...');
      await db.execute(sql`DELETE FROM calendar_events WHERE type = 'booking'`);
      console.log('   ✅ Cleared booking calendar events');
    } else {
      console.log('7. ⚠️  calendar_events table does not exist - skipping');
    }

    // Force delete ALL booking requests using raw SQL
    console.log('8. Force deleting ALL booking requests...');
    await db.execute(sql`DELETE FROM booking_requests`);
    console.log('   ✅ Deleted all booking requests using raw SQL');

    // Verify cleanup
    console.log('\n=== VERIFICATION ===');
    const remainingBookings = await db.execute(sql`SELECT COUNT(*) as count FROM booking_requests`);
    const remainingNotifications = await db.execute(sql`SELECT COUNT(*) as count FROM notifications`);
    
    const bookingCount = remainingBookings[0]?.count || 0;
    const notificationCount = remainingNotifications[0]?.count || 0;
    
    console.log(`📋 Booking requests remaining: ${bookingCount}`);
    console.log(`🔔 Notifications remaining: ${notificationCount}`);

    if (bookingCount === 0 && notificationCount === 0) {
      console.log('\n✅ SUCCESS: All booking data has been completely cleared!');
      console.log('🔄 Please refresh your browser to see the changes.');
      console.log('💡 Try a hard refresh (Ctrl+F5) if data still appears cached.');
    } else {
      console.log('\n⚠️  Some data may still remain. Manual intervention may be required.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

clearAllBookingData();
