import { and, eq } from "drizzle-orm";

import { db } from "../database/db";
import { teamMembers, teams } from "../database/schema";

type Team = typeof teams.$inferSelect;
// type TeamMember = typeof teamMembers.$inferSelect;

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
  static async createTeam(id: string, name: string, addedBy: string): Promise<Team> {
    const result = await db
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
   * Returns null when no team is found to allow callers to handle missing teams
   * gracefully without throwing exceptions.
   *
   * @param id - The unique team identifier
   * @returns The team record if found, null otherwise
   */
  static async getTeam(id: string): Promise<Team | null> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));

    return team || null;
  }

  /**
   * Adds a user to a team's member list.
   *
   * Uses onConflictDoNothing() to handle duplicate additions gracefully - if a user
   * is already a team member, the operation silently succeeds. This prevents errors
   * when administrators accidentally try to add someone twice and ensures idempotent
   * behavior for team management commands.
   *
   * @param teamId - The team's unique identifier
   * @param userId - Discord user ID to add to the team
   * @param addedBy - Discord user ID of the administrator performing this action
   */
  static async addMember(teamId: string, userId: string, addedBy: string): Promise<void> {
    await db
      .insert(teamMembers)
      .values({
        teamId,
        userId,
        addedBy,
      })
      .onConflictDoNothing();
  }

  /**
   * Removes a user from a team's member list.
   *
   * Returns a boolean to indicate whether removal actually occurred, allowing
   * calling code to provide appropriate feedback to Discord users (e.g.,
   * "User was not a member of this team" vs "User removed successfully").
   *
   * We check existence first to avoid executing unnecessary DELETE operations
   * and to provide meaningful return values to the caller.
   *
   * @param teamId - The team's unique identifier
   * @param userId - Discord user ID to remove from the team
   * @returns true if the user was removed, false if they weren't a member
   */
  static async removeMember(teamId: string, userId: string): Promise<boolean> {
    // Check if member exists first to avoid unnecessary DELETE operations.
    const existing = await this.isTeamMember(teamId, userId);
    if (!existing) return false;

    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

    return true;
  }

  /**
   * Retrieves all member user IDs for a specific team.
   *
   * Returns an array of Discord user IDs which can be used to mention or ping
   * all team members. We only select the userId field to minimize data transfer
   * since that's all callers need for Discord operations.
   *
   * @param teamId - The team's unique identifier
   * @returns Array of Discord user IDs belonging to this team
   */
  static async getTeamMembers(teamId: string): Promise<string[]> {
    const members = await db
      .select({
        userId: teamMembers.userId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    return members.map((m: { userId: string }) => m.userId);
  }

  /**
   * Checks if a specific user is a member of a specific team.
   *
   * This method is used for permission checking and validation before performing
   * team operations. It's also used internally by removeMember to avoid unnecessary
   * database operations.
   *
   * @param teamId - The team's unique identifier
   * @param userId - Discord user ID to check
   * @returns true if the user is a team member, false otherwise
   */
  static async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

    return !!member;
  }

  /**
   * Retrieves all teams in the system.
   *
   * Used primarily for Discord command autocomplete functionality, allowing users
   * to see available teams when typing commands. Also useful for administrative
   * overview and debugging purposes.
   *
   * @returns Array of all team records
   */
  static async getAllTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }

  /**
   * Helper methods that work with team names instead of IDs.
   *
   * These methods provide the user-facing API for Discord commands where users
   * type team names rather than remembering internal IDs. They internally resolve
   * the name to an ID and then delegate to the core ID-based methods.
   */

  /**
   * Retrieves a team by its human-readable name.
   *
   * This is the primary lookup method for Discord commands where users type
   * team names. The name field has a unique constraint in the database to
   * ensure this lookup is unambiguous.
   *
   * @param name - The team's display name (case-sensitive)
   * @returns The team record if found, null otherwise
   */
  static async getTeamByName(name: string): Promise<Team | null> {
    const [team] = await db.select().from(teams).where(eq(teams.name, name));

    return team || null;
  }

  /**
   * Adds a user to a team identified by name rather than ID.
   *
   * This method throws an error if the team doesn't exist, rather than returning
   * a boolean, because Discord commands need to provide clear error messages to
   * users when they specify invalid team names.
   *
   * @param teamName - The team's display name
   * @param userId - Discord user ID to add to the team
   * @param addedBy - Discord user ID of the administrator performing this action
   * @throws Error if the team name doesn't exist
   */
  static async addMemberByTeamName(
    teamName: string,
    userId: string,
    addedBy: string,
  ): Promise<void> {
    const team = await this.getTeamByName(teamName);
    if (!team) {
      throw new Error(`Team "${teamName}" not found`);
    }
    await this.addMember(team.id, userId, addedBy);
  }

  /**
   * Removes a user from a team identified by name rather than ID.
   *
   * Returns false if either the team doesn't exist OR the user wasn't a member.
   * This allows Discord commands to handle both scenarios gracefully without
   * distinguishing between "team not found" and "user not in team".
   *
   * @param teamName - The team's display name
   * @param userId - Discord user ID to remove from the team
   * @returns true if the user was removed, false if team doesn't exist or user wasn't a member
   */
  static async removeMemberByTeamName(teamName: string, userId: string): Promise<boolean> {
    const team = await this.getTeamByName(teamName);
    if (!team) {
      return false;
    }

    return this.removeMember(team.id, userId);
  }

  /**
   * Retrieves all member user IDs for a team identified by name.
   *
   * Returns an empty array if the team doesn't exist, allowing callers to
   * handle missing teams gracefully (e.g., "No members found" vs explicit
   * error handling).
   *
   * @param teamName - The team's display name
   * @returns Array of Discord user IDs belonging to this team, or empty array if team doesn't exist
   */
  static async getTeamMembersByName(teamName: string): Promise<string[]> {
    const team = await this.getTeamByName(teamName);
    if (!team) {
      return [];
    }

    return this.getTeamMembers(team.id);
  }
}
