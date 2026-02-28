import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { resolve } from "node:path";

import * as schema from "../database/schema";

const migrationsFolder = resolve(import.meta.dirname, "../../drizzle");

export async function createTestDb() {
  const db = drizzle({ connection: { url: "file::memory:" } });

  await migrate(db, { migrationsFolder });

  return db;
}

// Tables are deleted in reverse dependency order to respect foreign key constraints.
export async function cleanAllTables(db: ReturnType<typeof drizzle>) {
  await db.delete(schema.uwcPollResults);
  await db.delete(schema.pollVotes);
  await db.delete(schema.teamMembers);
  await db.delete(schema.uwcPolls);
  await db.delete(schema.polls);
  await db.delete(schema.teams);
}
