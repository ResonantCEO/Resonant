
import { createCalendarMockData } from './create-calendar-mock-data';

async function runCalendarMockData() {
  console.log('🗓️  Starting calendar mock data generation...');
  
  try {
    const events = await createCalendarMockData();
    
    console.log('\n✅ Calendar mock data generation completed!');
    console.log(`📅 Generated ${events.length} calendar events`);
    console.log('\n📋 Event breakdown by type:');
    
    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(eventsByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} events`);
    });
    
    console.log('\n🎯 Next steps:');
    console.log('   1. The booking calendar component now has sample mock data');
    console.log('   2. Events are generated for both artist and venue profiles');
    console.log('   3. Each profile type has realistic calendar entries');
    console.log('   4. Data includes various event types, statuses, and time periods');
    
  } catch (error) {
    console.error('❌ Error generating calendar mock data:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCalendarMockData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runCalendarMockData };
