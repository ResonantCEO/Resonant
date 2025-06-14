
import { db } from './db';
import { friendships, notifications } from '../shared/schema';
import { inArray } from 'drizzle-orm';

async function clearFriendRequests() {
  console.log('Clearing all friend requests, friendships, and related notifications...');

  try {
    // Delete all friendships (this includes both pending friend requests and accepted friendships)
    const friendshipResult = await db.delete(friendships);
    console.log('Cleared all friendships from database');
    
    // Delete all friend-related notifications
    const notificationResult = await db.delete(notifications).where(
      inArray(notifications.type, ['friend_request', 'friend_accepted'])
    );
    console.log('Cleared all friend-related notifications from database');
    
    console.log(`Successfully cleared all friend requests, friendships, and related notifications from the database.`);
    console.log('Database is now clean of all friendship data.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error clearing friend requests:', error);
    process.exit(1);
  }
}

clearFriendRequests();
