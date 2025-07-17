import { db } from "./db";
import { teams } from "./schema";

async function seedTeams() {
  console.log("🌱 Seeding default teams...");

  try {
    // Insert default teams
    await db
      .insert(teams)
      .values([
        {
          id: "racheats",
          name: "RACheats",
          addedBy: "system",
        },
      ])
      .onConflictDoNothing();

    console.log("✅ Default teams seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding teams:", error);
  }
}

// Run if this file is executed directly
if (import.meta.main) {
  seedTeams();
}
