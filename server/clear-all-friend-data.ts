
import { db } from './db';
import { friendships, notifications } from '../shared/schema';
import { inArray } from 'drizzle-orm';

async function clearAllFriendData() {
  console.log('Clearing all friend requests, friendships, and notifications...');

  try {
    // Delete all friendships (pending, accepted, rejected, blocked)
    const friendshipResult = await db.delete(friendships);
    console.log('Cleared all friendships from database');
    
    // Delete all notifications (friend-related and all others)
    const notificationResult = await db.delete(notifications);
    console.log('Cleared all notifications from database');
    
    console.log('Successfully cleared all friend data and notifications from the database.');
    console.log('Database is now clean of all friendship and notification data.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error clearing friend data:', error);
    process.exit(1);
  }
}

clearAllFriendData();
