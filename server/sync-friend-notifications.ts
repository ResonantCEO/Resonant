
import { db } from './db';
import { friendships, notifications, profiles, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { notificationService } from './notifications';

async function syncFriendNotifications() {
  console.log('Starting friend request notification synchronization...');

  try {
    // Get all pending friend requests
    const pendingFriendships = await db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
        createdAt: friendships.createdAt,
      })
      .from(friendships)
      .where(eq(friendships.status, 'pending'));

    console.log(`Found ${pendingFriendships.length} pending friend requests`);

    for (const friendship of pendingFriendships) {
      // Check if notification exists for this friendship
      const existingNotification = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.type, 'friend_request'),
            eq(notifications.data, JSON.stringify({ 
              friendshipId: friendship.id,
              targetProfileId: friendship.addresseeId 
            }))
          )
        );

      if (existingNotification.length === 0) {
        console.log(`Creating missing notification for friendship ${friendship.id}`);

        // Get requester profile details
        const requesterProfile = await db
          .select()
          .from(profiles)
          .where(eq(profiles.id, friendship.requesterId));

        // Get addressee profile details to find the user ID
        const addresseeProfile = await db
          .select()
          .from(profiles)
          .where(eq(profiles.id, friendship.addresseeId));

        if (requesterProfile.length > 0 && addresseeProfile.length > 0) {
          const requester = requesterProfile[0];
          const addressee = addresseeProfile[0];

          // Get the requester's user details
          const requesterUser = await db
            .select()
            .from(users)
            .where(eq(users.id, requester.userId!));

          if (requesterUser.length > 0 && addressee.userId) {
            // Create the notification
            await notificationService.notifyFriendRequest(
              addressee.userId,
              requesterUser[0].id,
              requester.name,
              friendship.id,
              addressee.id,
              requester.id
            );

            console.log(`Created notification for friendship ${friendship.id}`);
          }
        }
      } else {
        console.log(`Notification already exists for friendship ${friendship.id}`);
      }
    }

    console.log('Friend request notification synchronization completed!');

  } catch (error) {
    console.error('Error during friend notification sync:', error);
    throw error;
  }
}

// Run the sync
syncFriendNotifications()
  .then(() => {
    console.log('✅ Friend notification sync completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  });
