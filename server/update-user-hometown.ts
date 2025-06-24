
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function updateUserHometown() {
  try {
    console.log("Updating user hometown to 80526...");
    
    // Update the user with email josgood05@gmail.com
    const result = await db
      .update(users)
      .set({ hometown: "Fort Collins, CO" })
      .where(eq(users.email, "josgood05@gmail.com"))
      .returning();
    
    if (result.length > 0) {
      console.log(`Successfully updated user ${result[0].email} hometown to ${result[0].hometown}`);
    } else {
      console.log("No user found with that email address");
    }
    
    console.log("User hometown update completed!");
    
  } catch (error) {
    console.error("Error updating user hometown:", error);
    throw error;
  }
}

// Run the update
updateUserHometown()
  .then(() => {
    console.log("Update completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Update failed:", error);
    process.exit(1);
  });
