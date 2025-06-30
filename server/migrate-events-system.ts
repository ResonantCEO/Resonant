
import { db } from "./db";
import { events, eventTicketTypes, eventAttendance } from "../shared/schema";

async function migrateEventsSystem() {
  try {
    console.log("Creating events system tables...");

    // The tables will be created automatically by Drizzle based on the schema
    // We just need to ensure the schema is up to date

    // Create some sample events for testing
    const sampleEvents = [
      {
        organizerProfileId: 13, // Artist profile
        venueProfileId: 15, // Venue profile
        artistProfileIds: [13],
        name: "Arctic Monkeys Live Concert",
        description: "An electrifying night of indie rock with Arctic Monkeys performing their greatest hits and new material.",
        eventDate: new Date("2025-07-15T20:00:00Z"),
        eventTime: "8:00 PM",
        duration: 120,
        genre: "Indie Rock",
        ageRestriction: "all_ages",
        status: "published" as const,
        capacity: 500,
        ticketsAvailable: true,
        ticketSalesStart: new Date("2025-05-20T10:00:00Z"),
        ticketSalesEnd: new Date("2025-07-15T18:00:00Z"),
        eventImageUrl: "/uploads/profile-1748278922133-878620440.jpg",
        tags: ["indie", "rock", "live music"],
        socialLinks: {
          facebook: "https://facebook.com/arcticmonkeys",
          instagram: "@arcticmonkeys"
        },
        requiresApproval: false,
        isPrivate: false,
      },
      {
        organizerProfileId: 15, // Venue profile
        venueProfileId: 15,
        artistProfileIds: [13],
        name: "Local Music Festival 2025",
        description: "A day-long festival featuring local artists and bands from the community.",
        eventDate: new Date("2025-08-22T14:00:00Z"),
        eventTime: "2:00 PM",
        duration: 480,
        genre: "Mixed",
        ageRestriction: "all_ages",
        status: "published" as const,
        capacity: 1000,
        ticketsAvailable: true,
        ticketSalesStart: new Date("2025-06-01T10:00:00Z"),
        ticketSalesEnd: new Date("2025-08-22T12:00:00Z"),
        tags: ["festival", "local", "community"],
        requiresApproval: false,
        isPrivate: false,
      },
    ];

    // Check if events already exist to avoid duplicates
    const existingEvents = await db.select().from(events);
    
    if (existingEvents.length === 0) {
      const insertedEvents = await db.insert(events).values(sampleEvents).returning();
      console.log("✅ Sample events created");

      // Create sample ticket types
      const sampleTicketTypes = [
        {
          eventId: insertedEvents[0].id,
          name: "General Admission",
          description: "Standard entry to the concert",
          price: 89.50,
          quantity: 400,
          quantitySold: 0,
          saleStart: new Date("2025-05-20T10:00:00Z"),
          saleEnd: new Date("2025-07-15T18:00:00Z"),
          isActive: true,
          benefits: ["Entry to venue", "Standing room"]
        },
        {
          eventId: insertedEvents[0].id,
          name: "VIP Package",
          description: "Premium experience with meet & greet",
          price: 150.00,
          quantity: 50,
          quantitySold: 0,
          saleStart: new Date("2025-05-20T10:00:00Z"),
          saleEnd: new Date("2025-07-15T18:00:00Z"),
          isActive: true,
          benefits: ["Entry to venue", "Meet & greet", "Priority seating", "Exclusive merchandise"]
        },
        {
          eventId: insertedEvents[1].id,
          name: "Festival Pass",
          description: "Full day access to all performances",
          price: 125.00,
          quantity: 800,
          quantitySold: 0,
          saleStart: new Date("2025-06-01T10:00:00Z"),
          saleEnd: new Date("2025-08-22T12:00:00Z"),
          isActive: true,
          benefits: ["All-day access", "Food voucher", "Festival t-shirt"]
        },
        {
          eventId: insertedEvents[1].id,
          name: "VIP Festival Experience",
          description: "Premium festival experience with perks",
          price: 200.00,
          quantity: 100,
          quantitySold: 0,
          saleStart: new Date("2025-06-01T10:00:00Z"),
          saleEnd: new Date("2025-08-22T12:00:00Z"),
          isActive: true,
          benefits: ["All-day access", "VIP area access", "Premium food & drinks", "Artist meet & greets", "Exclusive merchandise"]
        }
      ];

      await db.insert(eventTicketTypes).values(sampleTicketTypes);
      console.log("✅ Sample ticket types created");
    } else {
      console.log("✅ Events table already has data");
    }

    console.log("✅ Events system migration completed successfully");
  } catch (error) {
    console.error("❌ Error migrating events system:", error);
    throw error;
  }
}

// Check if this is the main module (ES module way)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

// Run migration if this file is executed directly
if (isMainModule) {
  migrateEventsSystem()
    .then(() => {
      console.log("Migration completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migrateEventsSystem };
