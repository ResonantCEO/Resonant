
import { db } from './db';
import { notifications, friendships } from '@shared/schema';
import { eq, and, or, not, inArray } from 'drizzle-orm';

async function cleanupOrphanedNotifications() {
  console.log('Starting cleanup of orphaned friend request notifications...');

  try {
    // Get all friend request notifications
    const friendRequestNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.type, 'friend_request'));

    console.log(`Found ${friendRequestNotifications.length} friend request notifications`);

    if (friendRequestNotifications.length === 0) {
      console.log('No friend request notifications found. Cleanup complete.');
      return;
    }

    // Get all existing pending friend requests
    const existingFriendRequests = await db
      .select()
      .from(friendships)
      .where(eq(friendships.status, 'pending'));

    console.log(`Found ${existingFriendRequests.length} pending friend requests in database`);

    // If no pending friend requests exist, delete all friend request notifications
    if (existingFriendRequests.length === 0) {
      console.log('No pending friend requests found. Deleting all friend request notifications...');
      
      const result = await db
        .delete(notifications)
        .where(eq(notifications.type, 'friend_request'));

      console.log(`Deleted ${friendRequestNotifications.length} orphaned friend request notifications`);
    } else {
      console.log('Some pending friend requests still exist. Keeping valid notifications.');
    }

    // Also clean up any friend_accepted notifications if no friendships exist
    const acceptedFriendships = await db
      .select()
      .from(friendships)
      .where(eq(friendships.status, 'accepted'));

    if (acceptedFriendships.length === 0) {
      console.log('No accepted friendships found. Cleaning up friend_accepted notifications...');
      
      const result = await db
        .delete(notifications)
        .where(eq(notifications.type, 'friend_accepted'));

      console.log('Cleaned up friend_accepted notifications');
    }

    console.log('Notification cleanup completed successfully!');

  } catch (error) {
    console.error('Error during notification cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanupOrphanedNotifications()
  .then(() => {
    console.log('✅ Orphaned notification cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
