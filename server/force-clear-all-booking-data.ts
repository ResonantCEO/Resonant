
import { db } from './db';
import { sql } from 'drizzle-orm';

async function forceClearAllBookingData() {
  console.log('=== FORCE CLEARING ALL BOOKING DATA WITH RAW SQL ===');

  try {
    // Get list of all tables
    console.log('1. Getting all table names...');
    const allTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const tableNames = allTables.map(t => t.table_name);
    console.log('   Tables found:', tableNames);

    // Force delete from all booking-related tables using raw SQL
    const tablesToClear = [
      'booking_requests',
      'contract_proposals', 
      'contract_negotiations',
      'contract_signatures',
      'notifications',
      'events',
      'calendar_events',
      'tickets',
      'ticket_transfers',
      'ticket_returns',
      'event_attendance',
      'event_ticket_types'
    ];

    for (const tableName of tablesToClear) {
      if (tableNames.includes(tableName)) {
        console.log(`2. Force clearing table: ${tableName}`);
        try {
          const result = await db.execute(sql.raw(`DELETE FROM ${tableName}`));
          console.log(`   ✅ Cleared ${tableName}`);
        } catch (error) {
          console.log(`   ⚠️  Error clearing ${tableName}:`, error.message);
        }
      } else {
        console.log(`   ⚠️  Table ${tableName} does not exist - skipping`);
      }
    }

    // Check final counts
    console.log('\n=== FINAL VERIFICATION ===');
    
    for (const tableName of tablesToClear) {
      if (tableNames.includes(tableName)) {
        try {
          const count = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`));
          console.log(`📊 ${tableName}: ${count[0]?.count || 0} records remaining`);
        } catch (error) {
          console.log(`📊 ${tableName}: Error checking count`);
        }
      }
    }

    // Also restart any sequences to reset IDs
    console.log('\n3. Resetting sequences...');
    try {
      await db.execute(sql`ALTER SEQUENCE booking_requests_id_seq RESTART WITH 1`);
      console.log('   ✅ Reset booking_requests_id_seq');
    } catch (error) {
      console.log('   ⚠️  Could not reset booking_requests_id_seq');
    }

    console.log('\n✅ FORCE CLEANUP COMPLETED!');
    console.log('🔄 Please refresh your browser and clear cache (Ctrl+F5)');
    console.log('💡 If data still appears, it may be cached in the frontend');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during force cleanup:', error);
    process.exit(1);
  }
}

forceClearAllBookingData();
