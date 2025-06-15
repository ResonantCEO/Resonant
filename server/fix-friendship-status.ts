
import { db } from './db';
import { friendships, notifications } from '@shared/schema';
import { eq, and, or, sql } from 'drizzle-orm';

async function fixFriendshipStatus() {
  console.log('Starting friendship status and notification sync fix...');

  try {
    // 1. Clean up friend request notifications that don't have corresponding pending friendships
    console.log('Cleaning up orphaned friend request notifications...');
    
    const friendRequestNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.type, 'friend_request'));

    console.log(`Found ${friendRequestNotifications.length} friend request notifications`);

    for (const notification of friendRequestNotifications) {
      const data = notification.data as any;
      const senderId = data?.senderId;
      const friendshipId = data?.friendshipId;

      if (friendshipId) {
        // Check if the friendship still exists and is pending
        const friendship = await db
          .select()
          .from(friendships)
          .where(
            and(
              eq(friendships.id, friendshipId),
              eq(friendships.status, 'pending')
            )
          );

        if (friendship.length === 0) {
          // Friendship doesn't exist or is not pending, delete the notification
          await db
            .delete(notifications)
            .where(eq(notifications.id, notification.id));
          console.log(`Deleted orphaned notification ${notification.id}`);
        }
      } else if (senderId) {
        // Legacy notification without friendshipId, check by senderId
        const pendingFriendships = await db
          .select()
          .from(friendships)
          .where(
            and(
              eq(friendships.requesterId, senderId),
              eq(friendships.status, 'pending')
            )
          );

        if (pendingFriendships.length === 0) {
          // No pending friendship from this sender, delete the notification
          await db
            .delete(notifications)
            .where(eq(notifications.id, notification.id));
          console.log(`Deleted orphaned notification ${notification.id} for sender ${senderId}`);
        }
      }
    }

    // 2. Clean up rejected friendships older than 24 hours to reset to "no friendship" state
    console.log('Cleaning up old rejected friendships...');
    
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const rejectedFriendships = await db
      .delete(friendships)
      .where(
        and(
          eq(friendships.status, 'rejected'),
          sql`${friendships.updatedAt} < ${oneDayAgo}`
        )
      );

    console.log('Cleaned up old rejected friendships');

    // 3. Update any friend request notifications without friendshipId to include it
    console.log('Updating legacy friend request notifications with friendship IDs...');
    
    const legacyNotifications = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.type, 'friend_request'),
          sql`${notifications.data}->>'friendshipId' IS NULL`
        )
      );

    for (const notification of legacyNotifications) {
      const data = notification.data as any;
      const senderId = data?.senderId;

      if (senderId) {
        const friendship = await db
          .select()
          .from(friendships)
          .where(
            and(
              eq(friendships.requesterId, senderId),
              eq(friendships.status, 'pending')
            )
          );

        if (friendship.length > 0) {
          // Update notification with friendship ID
          await db
            .update(notifications)
            .set({
              data: { ...data, friendshipId: friendship[0].id }
            })
            .where(eq(notifications.id, notification.id));
          console.log(`Updated notification ${notification.id} with friendship ID ${friendship[0].id}`);
        }
      }
    }

    console.log('Friendship status and notification sync completed successfully!');

  } catch (error) {
    console.error('Error during friendship status fix:', error);
    throw error;
  }
}

// Run the fix
fixFriendshipStatus()
  .then(() => {
    console.log('✅ Friendship status fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });
