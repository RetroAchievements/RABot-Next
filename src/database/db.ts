import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new BetterSqlite3("rabot.db");

// Enable WAL mode for better concurrent access.
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA synchronous = NORMAL");

export const db = drizzle(sqlite);
