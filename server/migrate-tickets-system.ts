
import { db } from "./db";
import { tickets, ticketTransfers, ticketReturns } from "../shared/schema";

async function migrateTicketsSystem() {
  try {
    console.log("Creating tickets system tables...");

    // The tables will be created automatically by Drizzle based on the schema
    // We just need to ensure the schema is up to date

    // Create some sample tickets for testing
    const sampleTickets = [
      {
        eventId: 1,
        profileId: 16, // Assuming this is an audience profile
        originalPurchaserId: 16,
        ticketType: "general",
        sectionName: "Section A",
        rowName: "Row 12",
        seatNumber: "15-16",
        price: 89.50,
        qrCode: "TICKET_123456789",
        orderNumber: "ORD-2025-001",
        status: "active" as const,
        purchaseDate: new Date("2025-05-20T10:30:00Z"),
        eventDate: new Date("2025-07-15T20:00:00Z"),
        eventTime: "8:00 PM",
        venue: "Red Rocks Amphitheatre",
        eventName: "Arctic Monkeys Live",
        artistName: "Arctic Monkeys",
        artistImageUrl: "/uploads/profile-1748278922133-878620440.jpg",
        transferable: true,
        returnable: true,
        returnDeadline: new Date("2025-07-10T23:59:59Z"), // 5 days before event
      },
      {
        eventId: 2,
        profileId: 16,
        originalPurchaserId: 16,
        ticketType: "vip",
        sectionName: "VIP Area",
        price: 125.00,
        qrCode: "TICKET_987654321",
        orderNumber: "ORD-2025-002",
        status: "active" as const,
        purchaseDate: new Date("2025-06-01T15:45:00Z"),
        eventDate: new Date("2025-08-22T14:00:00Z"),
        eventTime: "2:00 PM",
        venue: "Downtown Park",
        eventName: "Local Music Festival 2025",
        artistName: "Various Artists",
        transferable: true,
        returnable: true,
        returnDeadline: new Date("2025-08-17T23:59:59Z"),
      },
    ];

    // Check if tickets already exist to avoid duplicates
    const existingTickets = await db.select().from(tickets);
    
    if (existingTickets.length === 0) {
      await db.insert(tickets).values(sampleTickets);
      console.log("✅ Sample tickets created");
    } else {
      console.log("✅ Tickets table already has data");
    }

    console.log("✅ Tickets system migration completed successfully");
  } catch (error) {
    console.error("❌ Error migrating tickets system:", error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateTicketsSystem()
    .then(() => {
      console.log("Migration completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migrateTicketsSystem };
