
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

    // Clean up friend request notifications that don't have corresponding pending friendships
    const pendingFriendships = await db
      .select()
      .from(friendships)
      .where(eq(friendships.status, 'pending'));

    if (pendingFriendships.length === 0) {
      console.log('No pending friendships found. Cleaning up all friend_request notifications...');
      
      const result = await db
        .delete(notifications)
        .where(eq(notifications.type, 'friend_request'));

      console.log('Cleaned up all friend_request notifications');
    } else {
      console.log(`Found ${pendingFriendships.length} pending friendships. Checking for orphaned friend_request notifications...`);
      
      // Get all friend request notifications
      const friendRequestNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.type, 'friend_request'));

      // Check each notification to see if it has a corresponding pending friendship
      const validNotificationIds = new Set();
      
      for (const notification of friendRequestNotifications) {
        const data = notification.data as any;
        if (data && data.friendshipId) {
          const correspondingFriendship = pendingFriendships.find(f => f.id === data.friendshipId);
          if (correspondingFriendship) {
            validNotificationIds.add(notification.id);
          }
        }
      }

      // Delete notifications that don't have corresponding pending friendships
      const orphanedNotifications = friendRequestNotifications.filter(n => !validNotificationIds.has(n.id));
      
      if (orphanedNotifications.length > 0) {
        const orphanedIds = orphanedNotifications.map(n => n.id);
        await db
          .delete(notifications)
          .where(inArray(notifications.id, orphanedIds));
        
        console.log(`Deleted ${orphanedNotifications.length} orphaned friend request notifications`);
      }
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
