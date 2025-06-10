
import { db } from './db';
import { profiles, users, friendships, profileMemberships } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function createMockData() {
  console.log('Creating mock data...');

  try {
    // Get your existing user ID (assuming you're user ID 2 based on logs)
    const existingUserId = 2;

    // Create mock users
    const mockUsers = [
      {
        email: 'sarah.artist@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'Sarah',
        lastName: 'Melody',
        profileImageUrl: '/uploads/profile-1748835171015-696000845.jpg',
        coverImageUrl: '/uploads/profile-1748832386369-388425338.jpg',
        theme: 'light',
        profileBackground: 'gradient-purple'
      },
      {
        email: 'mike.venue@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'Mike',
        lastName: 'Thompson',
        profileImageUrl: '/uploads/profile-1748830657913-876958416.png',
        coverImageUrl: '/uploads/profile-1748835171015-696000845.jpg',
        theme: 'dark',
        profileBackground: 'gradient-blue'
      },
      {
        email: 'alex.fan@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'Alex',
        lastName: 'Rivera',
        profileImageUrl: '/uploads/profile-1748832386369-388425338.jpg',
        coverImageUrl: '/uploads/profile-1748830657913-876958416.png',
        theme: 'light',
        profileBackground: 'gradient-green'
      },
      {
        email: 'luna.artist@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'Luna',
        lastName: 'Star',
        profileImageUrl: '/uploads/profile-1748835227138-295310004.jpg',
        coverImageUrl: '/uploads/profile-1748835277248-627281827.jpg',
        theme: 'dark',
        profileBackground: 'gradient-pink'
      },
      {
        email: 'harmony.venue@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'David',
        lastName: 'Chen',
        profileImageUrl: '/uploads/profile-1748835308055-277411541.jpg',
        coverImageUrl: '/uploads/profile-1748835171015-696000845.jpg',
        theme: 'light',
        profileBackground: 'gradient-orange'
      }
    ];

    // Insert mock users
    const insertedUsers = [];
    for (const userData of mockUsers) {
      const [user] = await db.insert(users).values(userData).returning();
      insertedUsers.push(user);
      console.log(`Created user: ${user.firstName} ${user.lastName}`);
    }

    // Create mock profiles
    const mockProfiles = [
      // Artist profiles
      {
        userId: insertedUsers[0].id,
        type: 'artist',
        name: 'Sarah Melody',
        bio: 'Indie folk singer-songwriter with a passion for storytelling through music. Currently touring the Pacific Northwest.',
        profileImageUrl: '/uploads/profile-1748835171015-696000845.jpg',
        coverImageUrl: '/uploads/profile-1748832386369-388425338.jpg',
        visibility: 'public',
        location: 'Portland, OR',
        isActive: true,
        profileBackground: 'gradient-purple'
      },
      {
        userId: insertedUsers[3].id,
        type: 'artist',
        name: 'Luna & The Midnight Collective',
        bio: 'Electronic music duo creating atmospheric soundscapes and dance floor anthems. Available for festivals and club bookings.',
        profileImageUrl: '/uploads/profile-1748835227138-295310004.jpg',
        coverImageUrl: '/uploads/profile-1748835277248-627281827.jpg',
        visibility: 'public',
        location: 'Los Angeles, CA',
        isActive: true,
        profileBackground: 'gradient-pink'
      },
      // Venue profiles
      {
        userId: insertedUsers[1].id,
        type: 'venue',
        name: 'The Blue Note Lounge',
        bio: 'Intimate jazz club featuring live music 7 nights a week. Historic venue with state-of-the-art sound system and craft cocktails.',
        profileImageUrl: '/uploads/profile-1748830657913-876958416.png',
        coverImageUrl: '/uploads/profile-1748835171015-696000845.jpg',
        visibility: 'public',
        location: 'Seattle, WA',
        isActive: true,
        profileBackground: 'gradient-blue'
      },
      {
        userId: insertedUsers[4].id,
        type: 'venue',
        name: 'Harmony Hall',
        bio: 'Premier concert venue with 1,200 capacity. Perfect acoustics and full production capabilities for touring acts.',
        profileImageUrl: '/uploads/profile-1748835308055-277411541.jpg',
        coverImageUrl: '/uploads/profile-1748835171015-696000845.jpg',
        visibility: 'public',
        location: 'Austin, TX',
        isActive: true,
        profileBackground: 'gradient-orange'
      },
      // Audience profiles
      {
        userId: insertedUsers[2].id,
        type: 'audience',
        name: 'Alex Rivera',
        bio: 'Music enthusiast and concert photographer. Love discovering new artists and documenting live performances.',
        profileImageUrl: '/uploads/profile-1748832386369-388425338.jpg',
        coverImageUrl: '/uploads/profile-1748830657913-876958416.png',
        visibility: 'public',
        location: 'San Francisco, CA',
        isActive: true,
        profileBackground: 'gradient-green'
      }
    ];

    // Insert mock profiles
    const insertedProfiles = [];
    for (const profileData of mockProfiles) {
      const [profile] = await db.insert(profiles).values(profileData).returning();
      insertedProfiles.push(profile);
      console.log(`Created ${profile.type} profile: ${profile.name}`);

      // Create profile membership for owner (required for shared profiles)
      if (profile.type === 'artist' || profile.type === 'venue') {
        await db.insert(profileMemberships).values({
          profileId: profile.id,
          userId: profile.userId,
          role: 'owner',
          permissions: ['manage_profile', 'manage_members', 'manage_posts', 'manage_events', 'manage_bookings', 'view_analytics', 'moderate_content'],
          status: 'active'
        });
        console.log(`Created owner membership for ${profile.name}`);
      }
    }

    // Get your existing profiles
    const yourProfiles = await db.select().from(profiles).where(eq(profiles.userId, existingUserId));
    console.log(`Found ${yourProfiles.length} existing profiles for user ${existingUserId}`);

    // Create friendships between your profiles and mock profiles
    const friendshipsToCreate = [];
    
    for (const yourProfile of yourProfiles) {
      for (const mockProfile of insertedProfiles) {
        // Create mutual friendships (both directions, accepted status)
        friendshipsToCreate.push({
          requesterId: yourProfile.id,
          addresseeId: mockProfile.id,
          status: 'accepted'
        });
        friendshipsToCreate.push({
          requesterId: mockProfile.id,
          addresseeId: yourProfile.id,
          status: 'accepted'
        });
      }
    }

    // Insert friendships in batches
    if (friendshipsToCreate.length > 0) {
      await db.insert(friendships).values(friendshipsToCreate);
      console.log(`Created ${friendshipsToCreate.length} friendship connections`);
    }

    // Create some friendships between mock profiles too
    const mockFriendships = [
      // Sarah (artist) friends with Alex (audience)
      {
        requesterId: insertedProfiles[0].id,
        addresseeId: insertedProfiles[4].id,
        status: 'accepted'
      },
      {
        requesterId: insertedProfiles[4].id,
        addresseeId: insertedProfiles[0].id,
        status: 'accepted'
      },
      // Luna (artist) friends with Blue Note Lounge (venue)
      {
        requesterId: insertedProfiles[1].id,
        addresseeId: insertedProfiles[2].id,
        status: 'accepted'
      },
      {
        requesterId: insertedProfiles[2].id,
        addresseeId: insertedProfiles[1].id,
        status: 'accepted'
      }
    ];

    await db.insert(friendships).values(mockFriendships);
    console.log(`Created ${mockFriendships.length} inter-mock friendships`);

    console.log('Mock data creation completed successfully!');
    console.log('\nSummary:');
    console.log(`- Created ${insertedUsers.length} mock users`);
    console.log(`- Created ${insertedProfiles.length} mock profiles:`);
    console.log(`  - ${insertedProfiles.filter(p => p.type === 'artist').length} artist profiles`);
    console.log(`  - ${insertedProfiles.filter(p => p.type === 'venue').length} venue profiles`);
    console.log(`  - ${insertedProfiles.filter(p => p.type === 'audience').length} audience profiles`);
    console.log(`- Created friendships with all your existing profiles`);

  } catch (error) {
    console.error('Error creating mock data:', error);
    throw error;
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  createMockData()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { createMockData };
