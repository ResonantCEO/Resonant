
import { db } from './db';
import { bookingRequests, notifications, contractProposals, contractNegotiations, contractSignatures, events, calendarEvents } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function checkDatabaseState() {
  console.log('=== DATABASE STATE CHECK ===');

  try {
    // Check booking requests
    const remainingBookings = await db.select().from(bookingRequests);
    console.log(`📋 Booking Requests remaining: ${remainingBookings.length}`);
    if (remainingBookings.length > 0) {
      console.log('   Remaining booking IDs:', remainingBookings.map(b => b.id));
    }

    // Check notifications
    const remainingNotifications = await db.select().from(notifications);
    console.log(`🔔 Total notifications remaining: ${remainingNotifications.length}`);
    
    // Check booking-related notifications specifically
    const bookingNotifications = remainingNotifications.filter(n => 
      n.type?.includes('booking') || 
      n.message?.toLowerCase().includes('booking') ||
      n.title?.toLowerCase().includes('booking')
    );
    console.log(`🔔 Booking-related notifications: ${bookingNotifications.length}`);
    if (bookingNotifications.length > 0) {
      bookingNotifications.forEach(n => {
        console.log(`   - ID: ${n.id}, Type: ${n.type}, Title: ${n.title}`);
      });
    }

    // Check contract-related tables
    const contractProposalsCount = await db.select().from(contractProposals);
    console.log(`📄 Contract proposals remaining: ${contractProposalsCount.length}`);

    const contractNegotiationsCount = await db.select().from(contractNegotiations);
    console.log(`💬 Contract negotiations remaining: ${contractNegotiationsCount.length}`);

    const contractSignaturesCount = await db.select().from(contractSignatures);
    console.log(`✍️ Contract signatures remaining: ${contractSignaturesCount.length}`);

    // Check events table (might be related to bookings)
    const eventsCount = await db.select().from(events);
    console.log(`🎪 Events remaining: ${eventsCount.length}`);

    // Check calendar events
    const calendarEventsCount = await db.select().from(calendarEvents);
    console.log(`📅 Calendar events remaining: ${calendarEventsCount.length}`);

    // Check if there are any other tables with booking-related data
    const allTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('\n📊 All database tables:');
    allTables.forEach(table => console.log(`   - ${table.table_name}`));

    console.log('\n=== END DATABASE CHECK ===');
    
  } catch (error) {
    console.error('❌ Error checking database state:', error);
  }
}

checkDatabaseState();
