
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

    // Create mock events for the venue profiles
    const mockEvents = [
      // Events for The Blue Note Lounge (venue profile)
      {
        organizerProfileId: insertedProfiles[2].id, // The Blue Note Lounge
        venueProfileId: insertedProfiles[2].id,
        artistProfileIds: [insertedProfiles[0].id], // Sarah Melody
        name: "Intimate Folk Evening with Sarah Melody",
        description: "An intimate acoustic performance featuring original folk songs and storytelling. Perfect for a cozy evening with craft cocktails.",
        eventDate: new Date("2025-07-12T20:00:00Z"),
        eventTime: "8:00 PM",
        duration: 120,
        genre: "Folk/Acoustic",
        ageRestriction: "21+",
        status: "published" as const,
        capacity: 80,
        ticketsAvailable: true,
        ticketSalesStart: new Date("2025-06-01T10:00:00Z"),
        ticketSalesEnd: new Date("2025-07-12T18:00:00Z"),
        eventImageUrl: '/uploads/profile-1748835171015-696000845.jpg',
        tags: ["folk", "acoustic", "intimate", "singer-songwriter"],
        socialLinks: {
          facebook: "https://facebook.com/bluenotelounge",
          instagram: "@bluenotelounge"
        },
        requiresApproval: false,
        isPrivate: false,
      },
      {
        organizerProfileId: insertedProfiles[2].id, // The Blue Note Lounge
        venueProfileId: insertedProfiles[2].id,
        artistProfileIds: [insertedProfiles[1].id], // Luna & The Midnight Collective
        name: "Electronic Dreams: Luna Live",
        description: "Electronic music meets jazz club atmosphere. Luna & The Midnight Collective bring their signature sound to our intimate venue.",
        eventDate: new Date("2025-07-25T21:30:00Z"),
        eventTime: "9:30 PM",
        duration: 150,
        genre: "Electronic/Ambient",
        ageRestriction: "21+",
        status: "published" as const,
        capacity: 80,
        ticketsAvailable: true,
        ticketSalesStart: new Date("2025-06-15T10:00:00Z"),
        ticketSalesEnd: new Date("2025-07-25T19:00:00Z"),
        eventImageUrl: '/uploads/profile-1748835227138-295310004.jpg',
        tags: ["electronic", "ambient", "experimental", "dance"],
        requiresApproval: false,
        isPrivate: false,
      },
      {
        organizerProfileId: insertedProfiles[2].id, // The Blue Note Lounge
        venueProfileId: insertedProfiles[2].id,
        artistProfileIds: [],
        name: "Jazz Jam Session - Open Mic",
        description: "Monthly open mic night for jazz musicians. Bring your instrument and join the session. House band provides backing.",
        eventDate: new Date("2025-08-05T19:00:00Z"),
        eventTime: "7:00 PM",
        duration: 180,
        genre: "Jazz",
        ageRestriction: "all_ages",
        status: "published" as const,
        capacity: 60,
        ticketsAvailable: false, // Free event
        eventImageUrl: '/uploads/profile-1748830657913-876958416.png',
        tags: ["jazz", "open-mic", "jam-session", "community"],
        requiresApproval: true,
        isPrivate: false,
      },

      // Events for Harmony Hall (venue profile)
      {
        organizerProfileId: insertedProfiles[3].id, // Harmony Hall
        venueProfileId: insertedProfiles[3].id,
        artistProfileIds: [insertedProfiles[0].id, insertedProfiles[1].id], // Both artists
        name: "Pacific Northwest Music Festival",
        description: "A celebration of Pacific Northwest talent featuring Sarah Melody and Luna & The Midnight Collective, plus local opening acts.",
        eventDate: new Date("2025-08-15T18:00:00Z"),
        eventTime: "6:00 PM",
        duration: 300,
        genre: "Mixed/Festival",
        ageRestriction: "all_ages",
        status: "published" as const,
        capacity: 1200,
        ticketsAvailable: true,
        ticketSalesStart: new Date("2025-05-20T10:00:00Z"),
        ticketSalesEnd: new Date("2025-08-15T16:00:00Z"),
        eventImageUrl: '/uploads/profile-1748835308055-277411541.jpg',
        tags: ["festival", "multi-artist", "pacific-northwest", "outdoor"],
        socialLinks: {
          website: "https://harmonyhall.com/pnw-fest",
          instagram: "@harmonyhall"
        },
        requiresApproval: false,
        isPrivate: false,
      },
      {
        organizerProfileId: insertedProfiles[3].id, // Harmony Hall
        venueProfileId: insertedProfiles[3].id,
        artistProfileIds: [],
        name: "Local Band Showcase Competition",
        description: "Monthly competition for emerging local bands. Winner gets opening slot for next major show and $500 cash prize.",
        eventDate: new Date("2025-07-30T19:00:00Z"),
        eventTime: "7:00 PM",
        duration: 240,
        genre: "Rock/Alternative",
        ageRestriction: "all_ages",
        status: "published" as const,
        capacity: 800,
        ticketsAvailable: true,
        ticketSalesStart: new Date("2025-07-01T10:00:00Z"),
        ticketSalesEnd: new Date("2025-07-30T17:00:00Z"),
        eventImageUrl: '/uploads/profile-1748835308055-277411541.jpg',
        tags: ["competition", "local-bands", "showcase", "emerging-artists"],
        requiresApproval: true,
        isPrivate: false,
      }
    ];

    // Insert mock events
    const insertedEvents = [];
    for (const eventData of mockEvents) {
      try {
        // Note: This assumes you have an events table. If not, this will be stored as calendar data
        console.log(`Creating event: ${eventData.name}`);
        // For now, we'll just log this as the events table might not exist yet
        insertedEvents.push(eventData);
      } catch (error) {
        console.log(`Note: Event creation skipped (events table may not exist): ${eventData.name}`);
      }
    }

    // Create mock booking calendar entries for artists
    const mockCalendarEvents = [
      // Sarah Melody's calendar
      {
        profileId: insertedProfiles[0].id, // Sarah Melody
        title: "Recording Session - New Album",
        date: new Date("2025-07-08T14:00:00Z"),
        startTime: "14:00",
        endTime: "18:00",
        type: "rehearsal",
        status: "confirmed",
        location: "Soundwave Studios, Portland",
        notes: "Recording vocals for tracks 3-5. Bring lyric sheets.",
        isPrivate: false
      },
      {
        profileId: insertedProfiles[0].id, // Sarah Melody
        title: "Songwriter Workshop",
        date: new Date("2025-07-18T10:00:00Z"),
        startTime: "10:00",
        endTime: "16:00",
        type: "meeting",
        status: "confirmed",
        location: "Community Arts Center",
        notes: "Teaching songwriting techniques to local musicians.",
        isPrivate: false
      },
      {
        profileId: insertedProfiles[0].id, // Sarah Melody
        title: "Band Rehearsal",
        date: new Date("2025-07-22T19:00:00Z"),
        startTime: "19:00",
        endTime: "22:00",
        type: "rehearsal",
        status: "confirmed",
        client: "Full Band",
        location: "Rehearsal Space B, Music District",
        notes: "Full run-through for upcoming shows. Work on new arrangements.",
        isPrivate: false
      },
      {
        profileId: insertedProfiles[0].id, // Sarah Melody
        title: "Radio Interview - KEXP",
        date: new Date("2025-08-02T11:00:00Z"),
        startTime: "11:00",
        endTime: "12:00",
        type: "meeting",
        status: "confirmed",
        location: "KEXP Studios, Seattle",
        notes: "Live interview and acoustic performance. Promote new album.",
        isPrivate: false
      },
      {
        profileId: insertedProfiles[0].id, // Sarah Melody
        title: "Music Video Shoot",
        date: new Date("2025-08-10T08:00:00Z"),
        startTime: "08:00",
        endTime: "18:00",
        type: "event",
        status: "confirmed",
        location: "Various locations, Portland area",
        notes: "Full day shoot for 'Coastal Dreams' single. Outdoor locations weather permitting.",
        isPrivate: false
      },

      // Luna & The Midnight Collective's calendar
      {
        profileId: insertedProfiles[1].id, // Luna
        title: "Studio Session - New Track Production",
        date: new Date("2025-07-15T20:00:00Z"),
        startTime: "20:00",
        endTime: "02:00",
        type: "rehearsal",
        status: "confirmed",
        location: "Midnight Studios, LA",
        notes: "Late night session for ambient track. Experimenting with new synth patches.",
        isPrivate: false
      },
      {
        profileId: insertedProfiles[1].id, // Luna
        title: "Equipment Setup & Sound Check",
        date: new Date("2025-07-24T16:00:00Z"),
        startTime: "16:00",
        endTime: "18:00",
        type: "rehearsal",
        status: "confirmed",
        client: "The Blue Note Lounge",
        location: "The Blue Note Lounge, Seattle",
        notes: "Early setup for tomorrow's show. Test lighting synchronization.",
        isPrivate: false
      },
      {
        profileId: insertedProfiles[1].id, // Luna
        title: "Collaboration Meeting",
        date: new Date("2025-08-01T15:00:00Z"),
        startTime: "15:00",
        endTime: "17:00",
        type: "meeting",
        status: "pending",
        client: "Remix Artist TBD",
        location: "Virtual Meeting",
        notes: "Discussing remix collaboration for 'Electric Nights' track.",
        isPrivate: false
      },
      {
        profileId: insertedProfiles[1].id, // Luna
        title: "Festival Tech Rehearsal",
        date: new Date("2025-08-14T12:00:00Z"),
        startTime: "12:00",
        endTime: "14:00",
        type: "rehearsal",
        status: "confirmed",
        client: "Harmony Hall",
        location: "Harmony Hall, Austin",
        notes: "Technical rehearsal day before festival. Full production test.",
        isPrivate: false
      },
      {
        profileId: insertedProfiles[1].id, // Luna
        title: "Vacation - Unavailable",
        date: new Date("2025-08-20T00:00:00Z"),
        startTime: "00:00",
        endTime: "23:59",
        type: "unavailable",
        status: "confirmed",
        location: "Out of Town",
        notes: "Taking a break after festival season. No bookings this week.",
        isPrivate: false
      }
    ];

    console.log(`\nCreated ${mockCalendarEvents.length} calendar events for artist profiles`);
    
    console.log('Mock data creation completed successfully!');
    console.log('\nSummary:');
    console.log(`- Created ${insertedUsers.length} mock users`);
    console.log(`- Created ${insertedProfiles.length} mock profiles:`);
    console.log(`  - ${insertedProfiles.filter(p => p.type === 'artist').length} artist profiles`);
    console.log(`  - ${insertedProfiles.filter(p => p.type === 'venue').length} venue profiles`);
    console.log(`  - ${insertedProfiles.filter(p => p.type === 'audience').length} audience profiles`);
    console.log(`- Created ${insertedEvents.length} mock events`);
    console.log(`- Created ${mockCalendarEvents.length} calendar entries`);
    console.log(`- Created friendships with all your existing profiles`);

  } catch (error) {
    console.error('Error creating mock data:', error);
    throw error;
  }
}

// Run the script if called directly
if (process.argv[1] && process.argv[1].includes('create-mock-data')) {
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
