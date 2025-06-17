
import { db } from "./db";
import { profiles, albums, photos } from "@shared/schema";
import { eq, and, isNotNull, or } from "drizzle-orm";

async function migrateExistingPhotos() {
  try {
    console.log("Migrating existing profile images to albums...");
    
    // Get all profiles with ANY images (not requiring all three)
    const profilesWithImages = await db
      .select()
      .from(profiles)
      .where(
        or(
          isNotNull(profiles.profileImageUrl),
          isNotNull(profiles.coverImageUrl),
          isNotNull(profiles.backgroundImageUrl)
        )
      );

    console.log(`Found ${profilesWithImages.length} profiles with images`);

    for (const profile of profilesWithImages) {
      console.log(`Processing profile: ${profile.name} (ID: ${profile.id})`);
      
      // Get albums for this profile
      const profileAlbums = await db
        .select()
        .from(albums)
        .where(eq(albums.profileId, profile.id));
      
      const profilePicturesAlbum = profileAlbums.find(album => album.name === "Profile Pictures");
      const coverPhotosAlbum = profileAlbums.find(album => album.name === "Cover Photos");
      const backgroundPicturesAlbum = profileAlbums.find(album => album.name === "Background Pictures");

      // Add profile image to Profile Pictures album
      if (profile.profileImageUrl && profilePicturesAlbum) {
        // Check if photo already exists
        const existingPhoto = await db
          .select()
          .from(photos)
          .where(
            and(
              eq(photos.profileId, profile.id),
              eq(photos.imageUrl, profile.profileImageUrl),
              eq(photos.albumId, profilePicturesAlbum.id)
            )
          )
          .limit(1);

        if (existingPhoto.length === 0) {
          await db.insert(photos).values({
            profileId: profile.id,
            albumId: profilePicturesAlbum.id,
            imageUrl: profile.profileImageUrl,
            caption: "Profile picture"
          });
          console.log(`  Added profile picture to album`);
        } else {
          console.log(`  Profile picture already exists in album`);
        }
      }

      // Add cover image to Cover Photos album
      if (profile.coverImageUrl && coverPhotosAlbum) {
        // Check if photo already exists
        const existingPhoto = await db
          .select()
          .from(photos)
          .where(
            and(
              eq(photos.profileId, profile.id),
              eq(photos.imageUrl, profile.coverImageUrl),
              eq(photos.albumId, coverPhotosAlbum.id)
            )
          )
          .limit(1);

        if (existingPhoto.length === 0) {
          await db.insert(photos).values({
            profileId: profile.id,
            albumId: coverPhotosAlbum.id,
            imageUrl: profile.coverImageUrl,
            caption: "Cover photo"
          });
          console.log(`  Added cover photo to album`);
        } else {
          console.log(`  Cover photo already exists in album`);
        }
      }

      // Add background image to Background Pictures album
      if (profile.backgroundImageUrl && backgroundPicturesAlbum) {
        // Check if photo already exists
        const existingPhoto = await db
          .select()
          .from(photos)
          .where(
            and(
              eq(photos.profileId, profile.id),
              eq(photos.imageUrl, profile.backgroundImageUrl),
              eq(photos.albumId, backgroundPicturesAlbum.id)
            )
          )
          .limit(1);

        if (existingPhoto.length === 0) {
          await db.insert(photos).values({
            profileId: profile.id,
            albumId: backgroundPicturesAlbum.id,
            imageUrl: profile.backgroundImageUrl,
            caption: "Background image"
          });
          console.log(`  Added background image to album`);
        } else {
          console.log(`  Background image already exists in album`);
        }
      }
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error migrating existing photos:", error);
    throw error;
  }
}

// Run the migration
migrateExistingPhotos()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
