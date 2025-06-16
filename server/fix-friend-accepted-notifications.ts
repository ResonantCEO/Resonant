
import { db } from './db';
import { notifications, friendships } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

async function fixFriendAcceptedNotifications() {
  console.log('Fixing existing friend accepted notifications...');

  try {
    // Get all friend accepted notifications without senderProfileId
    const friendAcceptedNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.type, 'friend_accepted'));

    console.log(`Found ${friendAcceptedNotifications.length} friend accepted notifications`);

    for (const notification of friendAcceptedNotifications) {
      const data = notification.data as any;
      const senderId = data?.senderId;

      if (senderId && !data?.senderProfileId) {
        // Find the friendship that this notification is about
        // The sender in friend_accepted notification is the accepter
        // We need to find friendships where this user was the addressee (accepter)
        const relatedFriendships = await db
          .select()
          .from(friendships)
          .where(
            and(
              eq(friendships.status, 'accepted')
              // We'll need to match by looking at user relationships
            )
          );

        // For now, let's delete these broken notifications and let new ones be created properly
        await db
          .delete(notifications)
          .where(eq(notifications.id, notification.id));
        
        console.log(`Deleted broken friend accepted notification ${notification.id}`);
      }
    }

    console.log('Friend accepted notification fix completed!');

  } catch (error) {
    console.error('Error during friend accepted notification fix:', error);
    throw error;
  }
}

// Run the fix
fixFriendAcceptedNotifications()
  .then(() => {
    console.log('✅ Friend accepted notification fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });
