
import { db } from './db';
import { notifications, friendships } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

async function fixNotificationFriendshipSync() {
  console.log('Starting notification-friendship sync fix...');

  try {
    // Get all friend request notifications
    const friendRequestNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.type, 'friend_request'));

    console.log(`Found ${friendRequestNotifications.length} friend request notifications`);

    for (const notification of friendRequestNotifications) {
      const data = notification.data as any;
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
          console.log(`Deleting orphaned notification ${notification.id} for friendship ${friendshipId}`);
          await db
            .delete(notifications)
            .where(eq(notifications.id, notification.id));
        } else {
          console.log(`Notification ${notification.id} has valid friendship ${friendshipId}`);
        }
      } else {
        // No friendship ID in notification data, delete it
        console.log(`Deleting notification ${notification.id} without friendship ID`);
        await db
          .delete(notifications)
          .where(eq(notifications.id, notification.id));
      }
    }

    console.log('Notification-friendship sync fix completed!');

  } catch (error) {
    console.error('Error during notification-friendship sync fix:', error);
    throw error;
  }
}

// Run the fix
fixNotificationFriendshipSync()
  .then(() => {
    console.log('✅ Notification-friendship sync fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });
