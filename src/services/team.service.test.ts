import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanAllTables, createTestDb } from "../test/create-test-db";
import { TeamService } from "./team.service";

let testDb: Awaited<ReturnType<typeof createTestDb>>;

vi.mock("../database/db", () => ({
  get db() {
    return testDb;
  },
}));

describe("Service: TeamService", () => {
  beforeAll(async () => {
    testDb = await createTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables(testDb);
  });

  describe("createTeam", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.createTeam).toBeDefined();
    });

    it("creates a new team with the provided details", async () => {
      // ACT
      const result = await TeamService.createTeam("test-team-id", "test-team", "admin123");

      // ASSERT
      expect(result.id).toEqual("test-team-id");
      expect(result.name).toEqual("test-team");
      expect(result.addedBy).toEqual("admin123");
      expect(result.addedAt).toBeDefined();
    });
  });

  describe("getTeam", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.getTeam).toBeDefined();
    });

    it("returns a team when found", async () => {
      // ARRANGE
      await TeamService.createTeam("team123", "My Team", "admin1");

      // ACT
      const result = await TeamService.getTeam("team123");

      // ASSERT
      expect(result).not.toBeNull();
      expect(result?.id).toEqual("team123");
      expect(result?.name).toEqual("My Team");
    });

    it("returns null when team is not found", async () => {
      // ACT
      const result = await TeamService.getTeam("nonexistent");

      // ASSERT
      expect(result).toBeNull();
    });
  });

  describe("addMember", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.addMember).toBeDefined();
    });

    it("adds a member to a team", async () => {
      // ARRANGE
      await TeamService.createTeam("team123", "Team", "admin1");

      // ACT
      await TeamService.addMember("team123", "user456", "admin789");

      // ASSERT
      const isMember = await TeamService.isTeamMember("team123", "user456");
      expect(isMember).toEqual(true);
    });

    it("silently handles duplicate additions", async () => {
      // ARRANGE
      await TeamService.createTeam("team123", "Team", "admin1");
      await TeamService.addMember("team123", "user456", "admin789");

      // ACT - adding the same member again should not throw.
      await TeamService.addMember("team123", "user456", "admin789");

      // ASSERT
      const members = await TeamService.getTeamMembers("team123");
      expect(members).toEqual(["user456"]);
    });
  });

  describe("removeMember", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.removeMember).toBeDefined();
    });

    it("removes an existing member from a team", async () => {
      // ARRANGE
      await TeamService.createTeam("team123", "Team", "admin1");
      await TeamService.addMember("team123", "user456", "admin1");

      // ACT
      const result = await TeamService.removeMember("team123", "user456");

      // ASSERT
      expect(result).toEqual(true);

      const isMember = await TeamService.isTeamMember("team123", "user456");
      expect(isMember).toEqual(false);
    });

    it("returns false when member does not exist", async () => {
      // ARRANGE
      await TeamService.createTeam("team123", "Team", "admin1");

      // ACT
      const result = await TeamService.removeMember("team123", "user456");

      // ASSERT
      expect(result).toEqual(false);
    });
  });

  describe("getTeamMembers", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.getTeamMembers).toBeDefined();
    });

    it("returns an array of user IDs for team members", async () => {
      // ARRANGE
      await TeamService.createTeam("team123", "Team", "admin1");
      await TeamService.addMember("team123", "user1", "admin1");
      await TeamService.addMember("team123", "user2", "admin1");
      await TeamService.addMember("team123", "user3", "admin1");

      // ACT
      const result = await TeamService.getTeamMembers("team123");

      // ASSERT
      expect(result).toHaveLength(3);
      expect(result).toContain("user1");
      expect(result).toContain("user2");
      expect(result).toContain("user3");
    });

    it("returns an empty array when team has no members", async () => {
      // ARRANGE
      await TeamService.createTeam("team123", "Team", "admin1");

      // ACT
      const result = await TeamService.getTeamMembers("team123");

      // ASSERT
      expect(result).toEqual([]);
    });
  });

  describe("isTeamMember", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.isTeamMember).toBeDefined();
    });

    it("returns true when user is a team member", async () => {
      // ARRANGE
      await TeamService.createTeam("team123", "Team", "admin1");
      await TeamService.addMember("team123", "user456", "admin1");

      // ACT
      const result = await TeamService.isTeamMember("team123", "user456");

      // ASSERT
      expect(result).toEqual(true);
    });

    it("returns false when user is not a team member", async () => {
      // ARRANGE
      await TeamService.createTeam("team123", "Team", "admin1");

      // ACT
      const result = await TeamService.isTeamMember("team123", "user456");

      // ASSERT
      expect(result).toEqual(false);
    });
  });

  describe("getAllTeams", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.getAllTeams).toBeDefined();
    });

    it("returns all teams", async () => {
      // ARRANGE
      await TeamService.createTeam("team1", "Team One", "admin1");
      await TeamService.createTeam("team2", "Team Two", "admin1");

      // ACT
      const result = await TeamService.getAllTeams();

      // ASSERT
      expect(result).toHaveLength(2);
    });
  });

  describe("getTeamByName", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.getTeamByName).toBeDefined();
    });

    it("returns a team when found by name", async () => {
      // ARRANGE
      await TeamService.createTeam("team-id", "test-team", "admin1");

      // ACT
      const result = await TeamService.getTeamByName("test-team");

      // ASSERT
      expect(result).not.toBeNull();
      expect(result?.name).toEqual("test-team");
    });

    it("returns null when team is not found by name", async () => {
      // ACT
      const result = await TeamService.getTeamByName("nonexistent");

      // ASSERT
      expect(result).toBeNull();
    });
  });

  describe("addMemberByTeamName", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.addMemberByTeamName).toBeDefined();
    });

    it("adds a member when team exists", async () => {
      // ARRANGE
      await TeamService.createTeam("team123", "test-team", "admin1");

      // ACT
      await TeamService.addMemberByTeamName("test-team", "user456", "admin789");

      // ASSERT
      const isMember = await TeamService.isTeamMember("team123", "user456");
      expect(isMember).toEqual(true);
    });

    it("throws an error when team does not exist", async () => {
      // ASSERT
      await expect(
        TeamService.addMemberByTeamName("nonexistent", "user456", "admin789"),
      ).rejects.toThrow('Team "nonexistent" not found');
    });
  });

  describe("removeMemberByTeamName", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.removeMemberByTeamName).toBeDefined();
    });

    it("removes a member when team and member exist", async () => {
      // ARRANGE
      await TeamService.createTeam("team123", "test-team", "admin1");
      await TeamService.addMember("team123", "user456", "admin1");

      // ACT
      const result = await TeamService.removeMemberByTeamName("test-team", "user456");

      // ASSERT
      expect(result).toEqual(true);

      const isMember = await TeamService.isTeamMember("team123", "user456");
      expect(isMember).toEqual(false);
    });

    it("returns false when team does not exist", async () => {
      // ACT
      const result = await TeamService.removeMemberByTeamName("nonexistent", "user456");

      // ASSERT
      expect(result).toEqual(false);
    });
  });

  describe("getTeamMembersByName", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.getTeamMembersByName).toBeDefined();
    });

    it("returns team members when team exists", async () => {
      // ARRANGE
      await TeamService.createTeam("team123", "test-team", "admin1");
      await TeamService.addMember("team123", "user1", "admin1");
      await TeamService.addMember("team123", "user2", "admin1");

      // ACT
      const result = await TeamService.getTeamMembersByName("test-team");

      // ASSERT
      expect(result).toHaveLength(2);
      expect(result).toContain("user1");
      expect(result).toContain("user2");
    });

    it("returns empty array when team does not exist", async () => {
      // ACT
      const result = await TeamService.getTeamMembersByName("nonexistent");

      // ASSERT
      expect(result).toEqual([]);
    });
  });
});
