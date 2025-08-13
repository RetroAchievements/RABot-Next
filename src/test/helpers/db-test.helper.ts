import { randomBytes } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "../../database/schema";

/**
 * Creates an isolated test database instance.
 * Each test gets its own database file that's automatically cleaned up.
 */
export function createTestDatabase() {
  const testDbName = `test-${randomBytes(8).toString("hex")}.db`;
  const testDbPath = join(tmpdir(), testDbName);

  // Create a new database instance.
  const sqlite = new BetterSqlite3(testDbPath);

  // Enable WAL mode for better concurrent access.
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA synchronous = NORMAL");

  const db = drizzle(sqlite, { schema });

  // Run migrations on the test database.
  migrate(db, { migrationsFolder: "./drizzle" });

  // Return the database instance and cleanup function.
  return {
    db,
    sqlite,
    cleanup: () => {
      sqlite.close();
      if (existsSync(testDbPath)) {
        rmSync(testDbPath);
      }
      // Also clean up WAL and SHM files if they exist.
      if (existsSync(`${testDbPath}-wal`)) {
        rmSync(`${testDbPath}-wal`);
      }
      if (existsSync(`${testDbPath}-shm`)) {
        rmSync(`${testDbPath}-shm`);
      }
    },
  };
}

/**
 * Creates a test database wrapped in a transaction.
 * The transaction is automatically rolled back after the test.
 */
export function createTransactionalTestDatabase() {
  const { db, sqlite, cleanup: originalCleanup } = createTestDatabase();

  // Start a transaction.
  sqlite.exec("BEGIN");

  return {
    db,
    sqlite,
    cleanup: () => {
      // Rollback the transaction instead of committing.
      sqlite.exec("ROLLBACK");
      originalCleanup();
    },
  };
}

/**
 * Helper to create an in-memory test database (fastest option).
 */
export function createInMemoryTestDatabase() {
  const sqlite = new BetterSqlite3(":memory:");

  // Enable foreign keys.
  sqlite.exec("PRAGMA foreign_keys = ON");

  const db = drizzle(sqlite, { schema });

  // Run migrations on the in-memory database.
  migrate(db, { migrationsFolder: "./drizzle" });

  return {
    db,
    sqlite,
    cleanup: () => {
      sqlite.close();
    },
  };
}
