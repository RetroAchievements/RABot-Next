import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { logger } from "../utils/logger";

const sqlite = new BetterSqlite3("rabot.db");
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./drizzle" });

logger.info("✅ Migrations completed");
