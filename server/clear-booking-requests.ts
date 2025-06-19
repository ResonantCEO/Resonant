
import { db } from './db';
import { bookingRequests, notifications } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function clearBookingRequests() {
  console.log('Clearing all booking requests and related notifications...');

  try {
    // Delete all booking-related notifications first
    const bookingNotificationResult = await db.delete(notifications).where(
      eq(notifications.type, 'booking_request')
    );
    console.log('Cleared booking request notifications from database');

    const bookingAcceptedNotificationResult = await db.delete(notifications).where(
      eq(notifications.type, 'booking_accepted')
    );
    console.log('Cleared booking accepted notifications from database');

    const bookingDeclinedNotificationResult = await db.delete(notifications).where(
      eq(notifications.type, 'booking_declined')
    );
    console.log('Cleared booking declined notifications from database');

    // Delete all booking requests
    const bookingRequestResult = await db.delete(bookingRequests);
    console.log('Cleared all booking requests from database');
    
    console.log('Successfully cleared all booking requests and related notifications from the database.');
    console.log('Database is now clean of all booking data.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error clearing booking requests:', error);
    process.exit(1);
  }
}

clearBookingRequests();
