import { beforeEach, describe, expect, it, mock } from "bun:test";

import { createMockTeam, createMockTeamMember } from "../test/mocks/database.mock";
import { TeamService } from "./team.service";

// ... mock the database module ...
let mockDb: any;

mock.module("../database/db", () => {
  mockDb = {
    select: mock(() => mockDb),
    from: mock(() => mockDb),
    where: mock(() => Promise.resolve([])),
    insert: mock(() => mockDb),
    values: mock(() => mockDb),
    returning: mock(() => Promise.resolve([])),
    onConflictDoNothing: mock(() => Promise.resolve()),
    delete: mock(() => mockDb),
  };

  return { db: mockDb };
});

describe("Service: TeamService", () => {
  beforeEach(() => {
    // ... reset all mocks before each test ...
    mockDb.select.mockClear().mockReturnValue(mockDb);
    mockDb.from.mockClear().mockReturnValue(mockDb);
    mockDb.where.mockClear().mockResolvedValue([]);
    mockDb.insert.mockClear().mockReturnValue(mockDb);
    mockDb.values.mockClear().mockReturnValue(mockDb);
    mockDb.returning.mockClear().mockResolvedValue([]);
    mockDb.onConflictDoNothing.mockClear().mockResolvedValue(undefined);
    mockDb.delete.mockClear().mockReturnValue(mockDb);
  });

  describe("createTeam", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.createTeam).toBeDefined();
    });

    it("creates a new team with the provided details", async () => {
      // ARRANGE
      const mockTeam = createMockTeam({ id: "test-team-id", name: "test-team" });
      mockDb.returning.mockResolvedValue([mockTeam]);

      // ACT
      const result = await TeamService.createTeam("test-team-id", "test-team", "admin123");

      // ASSERT
      expect(mockDb.insert).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.values).toHaveBeenCalledWith({
        id: "test-team-id",
        name: "test-team",
        addedBy: "admin123",
      });
      expect(result).toEqual(mockTeam);
    });
  });

  describe("getTeam", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.getTeam).toBeDefined();
    });

    it("returns a team when found", async () => {
      // ARRANGE
      const mockTeam = createMockTeam({ id: "team123" });
      mockDb.where.mockResolvedValue([mockTeam]);

      // ACT
      const result = await TeamService.getTeam("team123");

      // ASSERT
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toEqual(mockTeam);
    });

    it("returns null when team is not found", async () => {
      // ARRANGE
      mockDb.where.mockResolvedValue([]);

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

      // ACT
      await TeamService.addMember("team123", "user456", "admin789");

      // ASSERT
      expect(mockDb.insert).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.values).toHaveBeenCalledWith({
        teamId: "team123",
        userId: "user456",
        addedBy: "admin789",
      });
      expect(mockDb.onConflictDoNothing).toHaveBeenCalled();
    });
  });

  describe("removeMember", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.removeMember).toBeDefined();
    });

    it("removes an existing member from a team", async () => {
      // ARRANGE
      const mockMember = createMockTeamMember();

      // ... mock isTeamMember to return true ...
      mockDb.where.mockResolvedValueOnce([mockMember]);

      // ACT
      const result = await TeamService.removeMember("team123", "user456");

      // ASSERT
      expect(mockDb.delete).toHaveBeenCalledWith(expect.anything());
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toEqual(true);
    });

    it("returns false when member does not exist", async () => {
      // ARRANGE

      // ... mock isTeamMember to return false ...
      mockDb.where.mockResolvedValueOnce([]);

      // ACT
      const result = await TeamService.removeMember("team123", "user456");

      // ASSERT
      expect(mockDb.delete).not.toHaveBeenCalled();
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
      const mockMembers = [{ userId: "user1" }, { userId: "user2" }, { userId: "user3" }];
      mockDb.where.mockResolvedValue(mockMembers);

      // ACT
      const result = await TeamService.getTeamMembers("team123");

      // ASSERT
      expect(mockDb.select).toHaveBeenCalledWith({ userId: expect.anything() });
      expect(result).toEqual(["user1", "user2", "user3"]);
    });

    it("returns an empty array when team has no members", async () => {
      // ARRANGE
      mockDb.where.mockResolvedValue([]);

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
      mockDb.where.mockResolvedValue([createMockTeamMember()]);

      // ACT
      const result = await TeamService.isTeamMember("team123", "user456");

      // ASSERT
      expect(result).toEqual(true);
    });

    it("returns false when user is not a team member", async () => {
      // ARRANGE
      mockDb.where.mockResolvedValue([]);

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
      const mockTeams = [
        createMockTeam({ id: "team1", name: "Team One" }),
        createMockTeam({ id: "team2", name: "Team Two" }),
      ];
      mockDb.from.mockReturnValue(Promise.resolve(mockTeams));

      // ACT
      const result = await TeamService.getAllTeams();

      // ASSERT
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(expect.anything());
      expect(result).toEqual(mockTeams);
    });
  });

  describe("getTeamByName", () => {
    it("is defined", () => {
      // ASSERT
      expect(TeamService.getTeamByName).toBeDefined();
    });

    it("returns a team when found by name", async () => {
      // ARRANGE
      const mockTeam = createMockTeam({ name: "test-team" });
      mockDb.where.mockResolvedValue([mockTeam]);

      // ACT
      const result = await TeamService.getTeamByName("test-team");

      // ASSERT
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toEqual(mockTeam);
    });

    it("returns null when team is not found by name", async () => {
      // ARRANGE
      mockDb.where.mockResolvedValue([]);

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
      const mockTeam = createMockTeam({ id: "team123", name: "test-team" });

      // ... mock getTeamByName ...
      mockDb.where.mockResolvedValueOnce([mockTeam]);

      // ACT
      await TeamService.addMemberByTeamName("test-team", "user456", "admin789");

      // ASSERT
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith({
        teamId: "team123",
        userId: "user456",
        addedBy: "admin789",
      });
    });

    it("throws an error when team does not exist", async () => {
      // ARRANGE
      mockDb.where.mockResolvedValueOnce([]);

      // ACT & ASSERT
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
      const mockTeam = createMockTeam({ id: "team123", name: "test-team" });
      const mockMember = createMockTeamMember();

      // ... mock getTeamByName ...
      mockDb.where.mockResolvedValueOnce([mockTeam]);
      // ... mock isTeamMember ...
      mockDb.where.mockResolvedValueOnce([mockMember]);

      // ACT
      const result = await TeamService.removeMemberByTeamName("test-team", "user456");

      // ASSERT
      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toEqual(true);
    });

    it("returns false when team does not exist", async () => {
      // ARRANGE
      mockDb.where.mockResolvedValueOnce([]);

      // ACT
      const result = await TeamService.removeMemberByTeamName("nonexistent", "user456");

      // ASSERT
      expect(mockDb.delete).not.toHaveBeenCalled();
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
      const mockTeam = createMockTeam({ id: "team123", name: "test-team" });
      const mockMembers = [{ userId: "user1" }, { userId: "user2" }];

      // ... mock getTeamByName ...
      mockDb.where.mockResolvedValueOnce([mockTeam]);
      // ... mock getTeamMembers ...
      mockDb.where.mockResolvedValueOnce(mockMembers);

      // ACT
      const result = await TeamService.getTeamMembersByName("test-team");

      // ASSERT
      expect(result).toEqual(["user1", "user2"]);
    });

    it("returns empty array when team does not exist", async () => {
      // ARRANGE
      mockDb.where.mockResolvedValueOnce([]);

      // ACT
      const result = await TeamService.getTeamMembersByName("nonexistent");

      // ASSERT
      expect(result).toEqual([]);
    });
  });
});
