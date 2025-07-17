import { and, eq } from "drizzle-orm";

import { db } from "../database/db";
import { teamMembers, teams } from "../database/schema";

type Team = typeof teams.$inferSelect;
// type TeamMember = typeof teamMembers.$inferSelect;

export class TeamService {
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

  static async getTeam(id: string): Promise<Team | null> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));

    return team || null;
  }

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

  static async removeMember(teamId: string, userId: string): Promise<boolean> {
    // Check if member exists first.
    const existing = await this.isTeamMember(teamId, userId);
    if (!existing) return false;

    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

    return true;
  }

  static async getTeamMembers(teamId: string): Promise<string[]> {
    const members = await db
      .select({
        userId: teamMembers.userId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    return members.map((m) => m.userId);
  }

  static async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

    return !!member;
  }

  static async getAllTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }

  // Helper methods that work with team names
  static async getTeamByName(name: string): Promise<Team | null> {
    const [team] = await db.select().from(teams).where(eq(teams.name, name));

    return team || null;
  }

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

  static async removeMemberByTeamName(teamName: string, userId: string): Promise<boolean> {
    const team = await this.getTeamByName(teamName);
    if (!team) {
      return false;
    }

    return this.removeMember(team.id, userId);
  }

  static async getTeamMembersByName(teamName: string): Promise<string[]> {
    const team = await this.getTeamByName(teamName);
    if (!team) {
      return [];
    }

    return this.getTeamMembers(team.id);
  }
}
