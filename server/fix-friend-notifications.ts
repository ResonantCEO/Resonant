
import { db } from './db';
import { notifications, friendships, profiles } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

async function fixFriendNotifications() {
  console.log('Starting fix for friend request notifications...');

  try {
    // Get all friend request notifications without targetProfileId
    const brokenNotifications = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.type, 'friend_request'),
          sql`${notifications.data}->>'targetProfileId' IS NULL`
        )
      );

    console.log(`Found ${brokenNotifications.length} friend request notifications without targetProfileId`);

    for (const notification of brokenNotifications) {
      const data = notification.data as any;
      const friendshipId = data?.friendshipId;

      if (friendshipId) {
        // Get the friendship to find the target profile
        const friendship = await db
          .select()
          .from(friendships)
          .where(eq(friendships.id, friendshipId));

        if (friendship.length > 0) {
          const targetProfileId = friendship[0].addresseeId;
          
          // Update the notification with targetProfileId
          await db
            .update(notifications)
            .set({
              data: { ...data, targetProfileId }
            })
            .where(eq(notifications.id, notification.id));

          console.log(`Updated notification ${notification.id} with targetProfileId ${targetProfileId}`);
        } else {
          // Friendship doesn't exist, delete the notification
          await db
            .delete(notifications)
            .where(eq(notifications.id, notification.id));
          console.log(`Deleted orphaned notification ${notification.id}`);
        }
      } else {
        // No friendship ID, delete the notification
        await db
          .delete(notifications)
          .where(eq(notifications.id, notification.id));
        console.log(`Deleted notification ${notification.id} without friendship ID`);
      }
    }

    console.log('Friend request notification fix completed successfully!');

  } catch (error) {
    console.error('Error during friend notification fix:', error);
    throw error;
  }
}

// Run the fix
fixFriendNotifications()
  .then(() => {
    console.log('✅ Friend notification fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });
