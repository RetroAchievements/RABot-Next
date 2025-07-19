import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

const sqlite = new Database("rabot.db");

// Enable WAL mode for better concurrent access.
// This allows multiple readers while writing is happening.
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA synchronous = NORMAL");

export const db = drizzle(sqlite);
