import { and, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import type * as schema from "../database/schema";
import { teamMembers, teams } from "../database/schema";

type Team = typeof teams.$inferSelect;
// type TeamMember = typeof teamMembers.$inferSelect;
type DrizzleDb = BetterSQLite3Database<typeof schema>;

/**
 * Service for managing Discord bot teams and their members.
 *
 * Teams in RABot serve as a way to organize users into groups that can be pinged
 * collectively. This is particularly useful for moderation teams, developer groups,
 * or special interest communities within the RetroAchievements Discord.
 *
 * The service implements a dual access pattern: teams can be accessed by either
 * their unique ID (used internally for database consistency) or their human-readable
 * name (used in Discord commands for better UX). This design allows Discord users
 * to use memorable team names while maintaining referential integrity in the database.
 */
export class TeamService {
  constructor(private db: DrizzleDb) {}

  /**
   * Creates a new team with a unique ID and human-readable name.
   *
   * The ID is typically generated as a hash or slug of the name to ensure uniqueness
   * while maintaining readability. We track who created the team for auditing purposes,
   * as team creation is restricted to administrators in most Discord servers.
   *
   * @param id - Unique identifier for the team (usually derived from name)
   * @param name - Human-readable team name displayed to users
   * @param addedBy - Discord user ID of the administrator who created this team
   * @returns The newly created team record
   */
  async createTeam(id: string, name: string, addedBy: string): Promise<Team> {
    const result = await this.db
      .insert(teams)
      .values({
        id,
        name,
        addedBy,
      })
      .returning();

    return result[0]!;
  }

  /**
   * Retrieves a team by its unique ID.
   *
   * This is the primary lookup method used internally by other service methods.
   * The ID is the definitive identifier for a team and ensures consistency
   * across all operations.
   *
   * @param id - The unique identifier of the team
   * @returns The team if found, null otherwise
   */
  async getTeam(id: string): Promise<Team | null> {
    const [team] = await this.db.select().from(teams).where(eq(teams.id, id));

    return team || null;
  }

  /**
   * Adds a user to a team.
   *
   * This method creates a new membership record linking a Discord user to a team.
   * We use onConflictDoNothing to ensure idempotency - if the user is already
   * a member, the operation silently succeeds rather than throwing an error.
   * This makes the command more user-friendly as users might not remember
   * if they've already been added.
   *
   * @param teamId - The ID of the team to add the member to
   * @param userId - Discord user ID of the member being added
   * @param addedBy - Discord user ID of who is adding this member (for audit trail)
   */
  async addMember(teamId: string, userId: string, addedBy: string): Promise<void> {
    await this.db
      .insert(teamMembers)
      .values({
        teamId,
        userId,
        addedBy,
      })
      .onConflictDoNothing();
  }

  /**
   * Removes a user from a team.
   *
   * This operation is conditional - it only deletes the membership if it exists.
   * We return a boolean to indicate whether the removal was successful, which
   * helps commands provide appropriate feedback to users.
   *
   * @param teamId - The ID of the team to remove the member from
   * @param userId - Discord user ID of the member to remove
   * @returns true if the member was removed, false if they weren't a member
   */
  async removeMember(teamId: string, userId: string): Promise<boolean> {
    const isMember = await this.isTeamMember(teamId, userId);
    if (!isMember) {
      return false;
    }

    await this.db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

    return true;
  }

  /**
   * Gets all members of a team.
   *
   * This returns a list of Discord user IDs that belong to the specified team.
   * These IDs can then be used to fetch user objects from Discord's API
   * for displaying member information or sending notifications.
   *
   * @param teamId - The ID of the team
   * @returns Array of Discord user IDs
   */
  async getTeamMembers(teamId: string): Promise<string[]> {
    const members = await this.db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    return members.map((m) => m.userId);
  }

  /**
   * Checks if a user is a member of a team.
   *
   * This is a utility method used both internally and by commands that need
   * to verify membership before performing operations. It's particularly useful
   * for permission checks where only team members can perform certain actions.
   *
   * @param teamId - The ID of the team
   * @param userId - Discord user ID to check
   * @returns true if the user is a member, false otherwise
   */
  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    const [member] = await this.db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

    return !!member;
  }

  /**
   * Gets all teams in the system.
   *
   * This is primarily used by admin commands to list available teams
   * or by autocomplete handlers to provide team suggestions to users.
   * Teams are returned in the order they were created.
   *
   * @returns Array of all teams
   */
  async getAllTeams(): Promise<Team[]> {
    return this.db.select().from(teams);
  }

  /**
   * Gets a team by its human-readable name.
   *
   * This is the user-facing lookup method, allowing Discord users to reference
   * teams by their memorable names rather than internal IDs. This is essential
   * for a good user experience in Discord commands.
   *
   * @param name - The human-readable name of the team
   * @returns The team if found, null otherwise
   */
  async getTeamByName(name: string): Promise<Team | null> {
    const [team] = await this.db.select().from(teams).where(eq(teams.name, name));

    return team || null;
  }

  /**
   * Adds a member to a team using the team's name.
   *
   * This is a convenience method that combines name lookup with member addition,
   * providing a more user-friendly API for Discord commands. It handles the
   * common pattern of users specifying teams by name rather than ID.
   *
   * @param teamName - The human-readable name of the team
   * @param userId - Discord user ID of the member to add
   * @param addedBy - Discord user ID of who is adding this member
   * @throws Error if the team doesn't exist
   */
  async addMemberByTeamName(teamName: string, userId: string, addedBy: string): Promise<void> {
    const team = await this.getTeamByName(teamName);
    if (!team) {
      throw new Error(`Team "${teamName}" not found`);
    }

    await this.addMember(team.id, userId, addedBy);
  }

  /**
   * Removes a member from a team using the team's name.
   *
   * Similar to addMemberByTeamName, this provides a user-friendly way to remove
   * members by specifying the team name. Returns false if either the team doesn't
   * exist or the user isn't a member, making it safe to call without pre-checks.
   *
   * @param teamName - The human-readable name of the team
   * @param userId - Discord user ID of the member to remove
   * @returns true if the member was removed, false otherwise
   */
  async removeMemberByTeamName(teamName: string, userId: string): Promise<boolean> {
    const team = await this.getTeamByName(teamName);
    if (!team) {
      return false;
    }

    return this.removeMember(team.id, userId);
  }

  /**
   * Gets all members of a team by the team's name.
   *
   * Convenience method for retrieving team members when only the team name
   * is known. Returns an empty array if the team doesn't exist, avoiding
   * null checks in calling code.
   *
   * @param teamName - The human-readable name of the team
   * @returns Array of Discord user IDs, empty if team doesn't exist
   */
  async getTeamMembersByName(teamName: string): Promise<string[]> {
    const team = await this.getTeamByName(teamName);
    if (!team) {
      return [];
    }

    return this.getTeamMembers(team.id);
  }
}
