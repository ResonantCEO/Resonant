
import { db } from './db';
import { friendships, notifications, profiles } from '@shared/schema';
import { eq, and, or, inArray } from 'drizzle-orm';

async function cleanupOrphanedFriendships() {
  console.log('Starting cleanup of orphaned friendship records...');

  try {
    // Get all pending friendships
    const pendingFriendships = await db
      .select()
      .from(friendships)
      .where(eq(friendships.status, 'pending'));

    console.log(`Found ${pendingFriendships.length} pending friendships`);

    if (pendingFriendships.length === 0) {
      console.log('No pending friendships found. Cleanup complete.');
      return;
    }

    // Check which profiles still exist
    const profileIds = [...new Set([
      ...pendingFriendships.map(f => f.requesterId),
      ...pendingFriendships.map(f => f.addresseeId)
    ])];

    const existingProfiles = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(inArray(profiles.id, profileIds));

    const existingProfileIds = new Set(existingProfiles.map(p => p.id));

    // Find friendships that reference non-existent profiles
    const orphanedFriendships = pendingFriendships.filter(friendship => 
      !existingProfileIds.has(friendship.requesterId) || 
      !existingProfileIds.has(friendship.addresseeId)
    );

    if (orphanedFriendships.length > 0) {
      console.log(`Found ${orphanedFriendships.length} orphaned friendships with invalid profile references`);
      
      const orphanedIds = orphanedFriendships.map(f => f.id);
      await db
        .delete(friendships)
        .where(inArray(friendships.id, orphanedIds));
        
      console.log(`Deleted ${orphanedFriendships.length} orphaned friendships`);
    }

    // Clean up any remaining friend request notifications that don't have corresponding pending friendships
    const remainingFriendships = await db
      .select()
      .from(friendships)
      .where(eq(friendships.status, 'pending'));

    if (remainingFriendships.length === 0) {
      // If no pending friendships remain, clean up all friend request notifications
      await db
        .delete(notifications)
        .where(eq(notifications.type, 'friend_request'));
      
      console.log('Cleaned up all friend request notifications');
    }

    console.log('Friendship cleanup completed successfully!');

  } catch (error) {
    console.error('Error during friendship cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanupOrphanedFriendships()
  .then(() => {
    console.log('✅ Orphaned friendship cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
