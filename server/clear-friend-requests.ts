
import { db } from './db';
import { friendships } from '../shared/schema';

async function clearFriendRequests() {
  console.log('Clearing all friend requests and friendships...');

  try {
    // Delete all friendships (this includes both pending friend requests and accepted friendships)
    const result = await db.delete(friendships);
    
    console.log(`Successfully cleared all friend requests and friendships from the database.`);
    console.log('Database is now clean of all friendship data.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error clearing friend requests:', error);
    process.exit(1);
  }
}

clearFriendRequests();
