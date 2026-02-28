import { migrate } from "drizzle-orm/libsql/migrator";

import { logger } from "../utils/logger";
import { db } from "./db";

await migrate(db, { migrationsFolder: "./drizzle" });

logger.info("Migrations completed");
