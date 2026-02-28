import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import { logger } from "../utils/logger";

const db = drizzle({
  connection: { url: "file:rabot.db" },
});

await migrate(db, { migrationsFolder: "./drizzle" });

logger.info("Migrations completed");
