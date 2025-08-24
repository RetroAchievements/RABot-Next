import { logError, logger } from "../utils/logger";
import { db } from "./db";
import { teams } from "./schema";

async function seedTeams() {
  logger.info("🌱 Seeding default teams...");

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

    logger.info("✅ Default teams seeded successfully");
  } catch (error) {
    logError(error, { context: "seed_teams" });
  }
}

// Run if this file is executed directly
if (import.meta.main) {
  seedTeams();
}
