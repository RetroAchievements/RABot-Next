import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createInMemoryTestDatabase } from "../test/helpers/db-test.helper";
import { TeamService } from "./team.service";

describe("Service: TeamService", () => {
  let testDb: ReturnType<typeof createInMemoryTestDatabase>;
  let teamService: TeamService;

  beforeEach(() => {
    // Create a fresh in-memory database for each test.
    testDb = createInMemoryTestDatabase();
    teamService = new TeamService(testDb.db);
  });

  afterEach(() => {
    // Clean up the test database.
    testDb.cleanup();
  });

  describe("createTeam", () => {
    it("is defined", () => {
      // ASSERT
      expect(teamService.createTeam).toBeDefined();
    });

    it("creates a new team with the provided details", async () => {
      // ACT
      const team = await teamService.createTeam("test-team-id", "test-team", "admin123");

      // ASSERT
      expect(team).toBeDefined();
      expect(team.id).toBe("test-team-id");
      expect(team.name).toBe("test-team");
      expect(team.addedBy).toBe("admin123");
    });
  });

  describe("getTeam", () => {
    it("is defined", () => {
      // ASSERT
      expect(teamService.getTeam).toBeDefined();
    });

    it("returns a team when found", async () => {
      // ARRANGE
      await teamService.createTeam("team123", "Test Team", "admin");

      // ACT
      const team = await teamService.getTeam("team123");

      // ASSERT
      expect(team).toBeDefined();
      expect(team?.id).toBe("team123");
      expect(team?.name).toBe("Test Team");
    });

    it("returns null when team is not found", async () => {
      // ACT
      const team = await teamService.getTeam("nonexistent");

      // ASSERT
      expect(team).toBeNull();
    });
  });

  describe("addMember", () => {
    it("is defined", () => {
      // ASSERT
      expect(teamService.addMember).toBeDefined();
    });

    it("adds a member to a team", async () => {
      // ARRANGE
      await teamService.createTeam("team123", "Test Team", "admin");

      // ACT
      await teamService.addMember("team123", "user456", "admin789");

      // ASSERT
      const members = await teamService.getTeamMembers("team123");
      expect(members).toContain("user456");
    });

    it("is idempotent - adding the same member twice doesn't fail", async () => {
      // ARRANGE
      await teamService.createTeam("team123", "Test Team", "admin");

      // ACT
      await teamService.addMember("team123", "user456", "admin789");
      await teamService.addMember("team123", "user456", "admin789"); // Add again

      // ASSERT
      const members = await teamService.getTeamMembers("team123");
      expect(members).toHaveLength(1);
      expect(members).toContain("user456");
    });
  });

  describe("removeMember", () => {
    it("is defined", () => {
      // ASSERT
      expect(teamService.removeMember).toBeDefined();
    });

    it("removes an existing member from a team", async () => {
      // ARRANGE
      await teamService.createTeam("team123", "Test Team", "admin");
      await teamService.addMember("team123", "user456", "admin");

      // ACT
      const result = await teamService.removeMember("team123", "user456");

      // ASSERT
      expect(result).toBe(true);
      const members = await teamService.getTeamMembers("team123");
      expect(members).not.toContain("user456");
    });

    it("returns false when member does not exist", async () => {
      // ARRANGE
      await teamService.createTeam("team123", "Test Team", "admin");

      // ACT
      const result = await teamService.removeMember("team123", "user456");

      // ASSERT
      expect(result).toBe(false);
    });
  });

  describe("getTeamMembers", () => {
    it("is defined", () => {
      // ASSERT
      expect(teamService.getTeamMembers).toBeDefined();
    });

    it("returns an array of user IDs for team members", async () => {
      // ARRANGE
      await teamService.createTeam("team123", "Test Team", "admin");
      await teamService.addMember("team123", "user1", "admin");
      await teamService.addMember("team123", "user2", "admin");
      await teamService.addMember("team123", "user3", "admin");

      // ACT
      const members = await teamService.getTeamMembers("team123");

      // ASSERT
      expect(members).toHaveLength(3);
      expect(members).toEqual(expect.arrayContaining(["user1", "user2", "user3"]));
    });

    it("returns an empty array when team has no members", async () => {
      // ARRANGE
      await teamService.createTeam("team123", "Test Team", "admin");

      // ACT
      const members = await teamService.getTeamMembers("team123");

      // ASSERT
      expect(members).toEqual([]);
    });
  });

  describe("isTeamMember", () => {
    it("is defined", () => {
      // ASSERT
      expect(teamService.isTeamMember).toBeDefined();
    });

    it("returns true when user is a team member", async () => {
      // ARRANGE
      await teamService.createTeam("team123", "Test Team", "admin");
      await teamService.addMember("team123", "user456", "admin");

      // ACT
      const isMember = await teamService.isTeamMember("team123", "user456");

      // ASSERT
      expect(isMember).toBe(true);
    });

    it("returns false when user is not a team member", async () => {
      // ARRANGE
      await teamService.createTeam("team123", "Test Team", "admin");

      // ACT
      const isMember = await teamService.isTeamMember("team123", "user456");

      // ASSERT
      expect(isMember).toBe(false);
    });
  });

  describe("getAllTeams", () => {
    it("is defined", () => {
      // ASSERT
      expect(teamService.getAllTeams).toBeDefined();
    });

    it("returns all teams", async () => {
      // ARRANGE
      await teamService.createTeam("team1", "Team One", "admin");
      await teamService.createTeam("team2", "Team Two", "admin");

      // ACT
      const teams = await teamService.getAllTeams();

      // ASSERT
      expect(teams).toHaveLength(2);
      expect(teams.map((t) => t.name)).toEqual(expect.arrayContaining(["Team One", "Team Two"]));
    });

    it("returns empty array when no teams exist", async () => {
      // ACT
      const teams = await teamService.getAllTeams();

      // ASSERT
      expect(teams).toEqual([]);
    });
  });

  describe("getTeamByName", () => {
    it("is defined", () => {
      // ASSERT
      expect(teamService.getTeamByName).toBeDefined();
    });

    it("returns a team when found by name", async () => {
      // ARRANGE
      await teamService.createTeam("team-id", "test-team", "admin");

      // ACT
      const team = await teamService.getTeamByName("test-team");

      // ASSERT
      expect(team).toBeDefined();
      expect(team?.id).toBe("team-id");
      expect(team?.name).toBe("test-team");
    });

    it("returns null when team is not found by name", async () => {
      // ACT
      const team = await teamService.getTeamByName("nonexistent");

      // ASSERT
      expect(team).toBeNull();
    });
  });

  describe("addMemberByTeamName", () => {
    it("is defined", () => {
      // ASSERT
      expect(teamService.addMemberByTeamName).toBeDefined();
    });

    it("adds a member when team exists", async () => {
      // ARRANGE
      await teamService.createTeam("team123", "test-team", "admin");

      // ACT
      await teamService.addMemberByTeamName("test-team", "user456", "admin789");

      // ASSERT
      const members = await teamService.getTeamMembers("team123");
      expect(members).toContain("user456");
    });

    it("throws an error when team does not exist", async () => {
      // ASSERT
      await expect(
        teamService.addMemberByTeamName("nonexistent", "user456", "admin789"),
      ).rejects.toThrow('Team "nonexistent" not found');
    });
  });

  describe("removeMemberByTeamName", () => {
    it("is defined", () => {
      // ASSERT
      expect(teamService.removeMemberByTeamName).toBeDefined();
    });

    it("removes a member when team and member exist", async () => {
      // ARRANGE
      await teamService.createTeam("team123", "test-team", "admin");
      await teamService.addMember("team123", "user456", "admin");

      // ACT
      const result = await teamService.removeMemberByTeamName("test-team", "user456");

      // ASSERT
      expect(result).toBe(true);
      const members = await teamService.getTeamMembers("team123");
      expect(members).not.toContain("user456");
    });

    it("returns false when team does not exist", async () => {
      // ACT
      const result = await teamService.removeMemberByTeamName("nonexistent", "user456");

      // ASSERT
      expect(result).toBe(false);
    });

    it("returns false when member does not exist", async () => {
      // ARRANGE
      await teamService.createTeam("team123", "test-team", "admin");

      // ACT
      const result = await teamService.removeMemberByTeamName("test-team", "user456");

      // ASSERT
      expect(result).toBe(false);
    });
  });

  describe("getTeamMembersByName", () => {
    it("is defined", () => {
      // ASSERT
      expect(teamService.getTeamMembersByName).toBeDefined();
    });

    it("returns team members when team exists", async () => {
      // ARRANGE
      await teamService.createTeam("team123", "test-team", "admin");
      await teamService.addMember("team123", "user1", "admin");
      await teamService.addMember("team123", "user2", "admin");

      // ACT
      const members = await teamService.getTeamMembersByName("test-team");

      // ASSERT
      expect(members).toHaveLength(2);
      expect(members).toEqual(expect.arrayContaining(["user1", "user2"]));
    });

    it("returns empty array when team does not exist", async () => {
      // ACT
      const members = await teamService.getTeamMembersByName("nonexistent");

      // ASSERT
      expect(members).toEqual([]);
    });
  });
});