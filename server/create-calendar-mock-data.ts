
import { db } from './db';
import { profiles } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface CalendarEvent {
  id: string;
  profileId: number;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'booking' | 'event' | 'rehearsal' | 'meeting' | 'unavailable';
  status: 'confirmed' | 'pending' | 'cancelled';
  client?: string;
  location?: string;
  notes?: string;
  budget?: number;
  isPrivate?: boolean;
}

async function createCalendarMockData() {
  console.log('Creating mock calendar data...');

  try {
    // Get all artist and venue profiles
    const artistProfiles = await db.select().from(profiles).where(eq(profiles.type, 'artist'));
    const venueProfiles = await db.select().from(profiles).where(eq(profiles.type, 'venue'));

    console.log(`Found ${artistProfiles.length} artist profiles and ${venueProfiles.length} venue profiles`);

    const allCalendarEvents: CalendarEvent[] = [];

    // Generate events for each artist profile
    for (const artist of artistProfiles) {
      const artistEvents: CalendarEvent[] = [
        // Regular rehearsals
        {
          id: `artist-${artist.id}-rehearsal-1`,
          profileId: artist.id,
          title: "Band Rehearsal",
          date: new Date("2025-07-03T19:00:00Z"),
          startTime: "19:00",
          endTime: "22:00",
          type: "rehearsal",
          status: "confirmed",
          location: "Rehearsal Studio A",
          notes: "Working on new material for upcoming shows",
          isPrivate: false
        },
        {
          id: `artist-${artist.id}-rehearsal-2`,
          profileId: artist.id,
          title: "Solo Practice Session",
          date: new Date("2025-07-10T14:00:00Z"),
          startTime: "14:00",
          endTime: "17:00",
          type: "rehearsal",
          status: "confirmed",
          location: "Home Studio",
          notes: "Guitar practice and songwriting",
          isPrivate: true
        },
        
        // Recording sessions
        {
          id: `artist-${artist.id}-recording-1`,
          profileId: artist.id,
          title: "Studio Recording Session",
          date: new Date("2025-07-14T10:00:00Z"),
          startTime: "10:00",
          endTime: "18:00",
          type: "event",
          status: "confirmed",
          client: "Indie Records",
          location: "Soundwave Studios",
          notes: "Recording vocals for tracks 2-4",
          budget: 800,
          isPrivate: false
        },
        
        // Live performances
        {
          id: `artist-${artist.id}-gig-1`,
          profileId: artist.id,
          title: "Live Performance",
          date: new Date("2025-07-19T20:00:00Z"),
          startTime: "20:00",
          endTime: "23:00",
          type: "booking",
          status: "confirmed",
          client: venueProfiles[0]?.name || "Local Venue",
          location: venueProfiles[0]?.location || "Music District",
          notes: "Headline show with full band setup",
          budget: 1500,
          isPrivate: false
        },
        
        // Meetings and business
        {
          id: `artist-${artist.id}-meeting-1`,
          profileId: artist.id,
          title: "Label Meeting",
          date: new Date("2025-07-22T11:00:00Z"),
          startTime: "11:00",
          endTime: "12:30",
          type: "meeting",
          status: "confirmed",
          client: "Music Label Representatives",
          location: "Downtown Office",
          notes: "Discussing upcoming album release strategy",
          isPrivate: false
        },
        
        // Media and promotion
        {
          id: `artist-${artist.id}-promo-1`,
          profileId: artist.id,
          title: "Photo Shoot",
          date: new Date("2025-07-25T09:00:00Z"),
          startTime: "09:00",
          endTime: "15:00",
          type: "event",
          status: "confirmed",
          client: "Photography Studio",
          location: "Urban Photo Studio",
          notes: "Press photos for album promotion",
          budget: 600,
          isPrivate: false
        },
        
        // Pending bookings
        {
          id: `artist-${artist.id}-pending-1`,
          profileId: artist.id,
          title: "Festival Performance (Pending)",
          date: new Date("2025-08-05T16:00:00Z"),
          startTime: "16:00",
          endTime: "17:00",
          type: "booking",
          status: "pending",
          client: "Summer Music Festival",
          location: "Festival Grounds",
          notes: "Waiting for contract confirmation",
          budget: 3000,
          isPrivate: false
        },
        
        // Unavailable periods
        {
          id: `artist-${artist.id}-unavailable-1`,
          profileId: artist.id,
          title: "Personal Time - Unavailable",
          date: new Date("2025-08-12T00:00:00Z"),
          startTime: "00:00",
          endTime: "23:59",
          type: "unavailable",
          status: "confirmed",
          location: "Out of Town",
          notes: "Family vacation - not available for bookings",
          isPrivate: false
        }
      ];

      allCalendarEvents.push(...artistEvents);
    }

    // Generate events for each venue profile
    for (const venue of venueProfiles) {
      const venueEvents: CalendarEvent[] = [
        // Regular venue events
        {
          id: `venue-${venue.id}-event-1`,
          profileId: venue.id,
          title: "Jazz Night",
          date: new Date("2025-07-04T19:30:00Z"),
          startTime: "19:30",
          endTime: "23:00",
          type: "event",
          status: "confirmed",
          client: "Local Jazz Trio",
          location: venue.name,
          notes: "Regular Friday night jazz series",
          budget: 800,
          isPrivate: false
        },
        
        // Artist bookings
        {
          id: `venue-${venue.id}-booking-1`,
          profileId: venue.id,
          title: "Indie Rock Show",
          date: new Date("2025-07-11T20:00:00Z"),
          startTime: "20:00",
          endTime: "24:00",
          type: "booking",
          status: "confirmed",
          client: artistProfiles[0]?.name || "Touring Artist",
          location: venue.name,
          notes: "Opening act at 8pm, headliner at 10pm",
          budget: 2000,
          isPrivate: false
        },
        
        // Private events
        {
          id: `venue-${venue.id}-private-1`,
          profileId: venue.id,
          title: "Private Corporate Event",
          date: new Date("2025-07-16T18:00:00Z"),
          startTime: "18:00",
          endTime: "22:00",
          type: "event",
          status: "confirmed",
          client: "TechCorp Industries",
          location: venue.name,
          notes: "Company party with background music",
          budget: 3500,
          isPrivate: true
        },
        
        // Venue maintenance
        {
          id: `venue-${venue.id}-maintenance-1`,
          profileId: venue.id,
          title: "Sound System Maintenance",
          date: new Date("2025-07-18T10:00:00Z"),
          startTime: "10:00",
          endTime: "16:00",
          type: "unavailable",
          status: "confirmed",
          client: "Audio Tech Services",
          location: venue.name,
          notes: "Annual sound system check and calibration",
          isPrivate: false
        },
        
        // Setup and rehearsals
        {
          id: `venue-${venue.id}-setup-1`,
          profileId: venue.id,
          title: "Event Setup & Sound Check",
          date: new Date("2025-07-23T14:00:00Z"),
          startTime: "14:00",
          endTime: "18:00",
          type: "rehearsal",
          status: "confirmed",
          client: "Weekend Concert Series",
          location: venue.name,
          notes: "Stage setup and sound check for weekend shows",
          isPrivate: false
        },
        
        // Special events
        {
          id: `venue-${venue.id}-special-1`,
          profileId: venue.id,
          title: "Album Release Party",
          date: new Date("2025-07-30T19:00:00Z"),
          startTime: "19:00",
          endTime: "01:00",
          type: "event",
          status: "confirmed",
          client: artistProfiles[1]?.name || "Local Artist",
          location: venue.name,
          notes: "Exclusive album listening party with live performance",
          budget: 2500,
          isPrivate: false
        },
        
        // Pending bookings
        {
          id: `venue-${venue.id}-pending-1`,
          profileId: venue.id,
          title: "Wedding Reception (Pending)",
          date: new Date("2025-08-08T17:00:00Z"),
          startTime: "17:00",
          endTime: "23:00",
          type: "booking",
          status: "pending",
          client: "Private Client",
          location: venue.name,
          notes: "Waiting for final confirmation and deposit",
          budget: 4000,
          isPrivate: true
        }
      ];

      allCalendarEvents.push(...venueEvents);
    }

    console.log(`\nGenerated ${allCalendarEvents.length} calendar events:`);
    console.log(`- ${allCalendarEvents.filter(e => e.type === 'booking').length} bookings`);
    console.log(`- ${allCalendarEvents.filter(e => e.type === 'event').length} events`);
    console.log(`- ${allCalendarEvents.filter(e => e.type === 'rehearsal').length} rehearsals`);
    console.log(`- ${allCalendarEvents.filter(e => e.type === 'meeting').length} meetings`);
    console.log(`- ${allCalendarEvents.filter(e => e.type === 'unavailable').length} unavailable periods`);
    console.log(`\nStatus breakdown:`);
    console.log(`- ${allCalendarEvents.filter(e => e.status === 'confirmed').length} confirmed`);
    console.log(`- ${allCalendarEvents.filter(e => e.status === 'pending').length} pending`);
    console.log(`- ${allCalendarEvents.filter(e => e.status === 'cancelled').length} cancelled`);

    // Note: This data would typically be stored in a calendar events table
    // For now, we're just generating and logging the mock data structure
    console.log('\nMock calendar data created successfully!');
    console.log('Note: This data structure can be used to populate the booking calendar component');

    return allCalendarEvents;

  } catch (error) {
    console.error('Error creating calendar mock data:', error);
    throw error;
  }
}

// Run the script if called directly
if (process.argv[1] && process.argv[1].includes('create-calendar-mock-data')) {
  createCalendarMockData()
    .then(() => {
      console.log('Calendar mock data script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Calendar mock data script failed:', error);
      process.exit(1);
    });
}

export { createCalendarMockData };
