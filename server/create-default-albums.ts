
import { db } from "./db";
import { albums, profiles } from "@shared/schema";
import { eq } from "drizzle-orm";

async function createDefaultAlbums() {
  try {
    console.log("Creating default albums for all profiles...");
    
    // Get all existing profiles
    const allProfiles = await db.select().from(profiles);
    console.log(`Found ${allProfiles.length} profiles`);

    const defaultAlbums = [
      {
        name: "Profile Pictures",
        description: "Profile picture collection"
      },
      {
        name: "Cover Photos",
        description: "Cover photo collection"
      },
      {
        name: "Background Pictures",
        description: "Background image collection"
      }
    ];

    let totalCreated = 0;

    for (const profile of allProfiles) {
      console.log(`Creating default albums for profile: ${profile.name} (${profile.type})`);
      
      // Check if any of the default albums already exist for this profile
      const existingAlbums = await db
        .select()
        .from(albums)
        .where(eq(albums.profileId, profile.id));
      
      const existingAlbumNames = existingAlbums.map(album => album.name);
      
      for (const defaultAlbum of defaultAlbums) {
        if (!existingAlbumNames.includes(defaultAlbum.name)) {
          await db.insert(albums).values({
            profileId: profile.id,
            name: defaultAlbum.name,
            description: defaultAlbum.description
          });
          totalCreated++;
          console.log(`  Created album: ${defaultAlbum.name}`);
        } else {
          console.log(`  Album already exists: ${defaultAlbum.name}`);
        }
      }
    }

    console.log(`Default albums creation completed! Created ${totalCreated} albums total.`);
  } catch (error) {
    console.error("Error creating default albums:", error);
    throw error;
  }
}

// Run the migration
createDefaultAlbums()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
