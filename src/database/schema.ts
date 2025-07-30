import { primaryKey, sqliteTable as table } from "drizzle-orm/sqlite-core";
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
  }),
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
  }),
);

// UWC polls table.
export const uwcPolls = table("uwc_polls", {
  id: t.integer("id").primaryKey({ autoIncrement: true }),
  messageId: t.text("message_id").notNull().unique(),
  channelId: t.text("channel_id").notNull(),
  threadId: t.text("thread_id"), // Nullable - only for forum threads.
  creatorId: t.text("creator_id").notNull(),
  achievementId: t.integer("achievement_id"), // RA achievement ID if available.
  achievementName: t.text("achievement_name"), // For searching.
  gameId: t.integer("game_id"), // RA game ID if available.
  gameName: t.text("game_name"), // For searching.
  pollUrl: t.text("poll_url").notNull(), // Direct link to poll message.
  startedAt: t
    .integer("started_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  endedAt: t.integer("ended_at", { mode: "timestamp" }), // Null if active.
  status: t.text("status").notNull().default("active"), // 'active' | 'completed' | 'cancelled'
});

// UWC poll results table.
export const uwcPollResults = table("uwc_poll_results", {
  id: t.integer("id").primaryKey({ autoIncrement: true }),
  uwcPollId: t
    .integer("uwc_poll_id")
    .notNull()
    .references(() => uwcPolls.id, { onDelete: "cascade" }),
  optionText: t.text("option_text").notNull(), // e.g., "No, leave as is"
  voteCount: t.integer("vote_count").notNull().default(0),
  votePercentage: t.real("vote_percentage").notNull().default(0), // 0-100
});
