import { sqliteTable as table, primaryKey } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";

// Teams table.
export const teams = table("teams", {
  id: t.text("id").primaryKey(),
  name: t.text("name").notNull().unique(),
  addedBy: t.text("added_by").notNull(),
  addedAt: t
    .integer("added_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Team members table.
export const teamMembers = table(
  "team_members",
  {
    userId: t.text("user_id").notNull(),
    teamId: t
      .text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    addedBy: t.text("added_by").notNull(),
    addedAt: t
      .integer("added_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.teamId] }),
  })
);

// Polls table.
export const polls = table("polls", {
  id: t.integer("id").primaryKey({ autoIncrement: true }),
  messageId: t.text("message_id").notNull().unique(),
  channelId: t.text("channel_id").notNull(),
  creatorId: t.text("creator_id").notNull(),
  question: t.text("question").notNull(),
  options: t.text("options").notNull(), // JSON array.
  endTime: t.integer("end_time", { mode: "timestamp" }),
  createdAt: t
    .integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Poll votes table.
export const pollVotes = table(
  "poll_votes",
  {
    pollId: t
      .integer("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    userId: t.text("user_id").notNull(),
    optionIndex: t.integer("option_index").notNull(),
    votedAt: t
      .integer("voted_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.pollId, table.userId] }),
  })
);
