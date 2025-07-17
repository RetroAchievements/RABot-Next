import type { teamMembers, teams } from "../../database/schema";

type Team = typeof teams.$inferSelect;
type TeamMember = typeof teamMembers.$inferSelect;

export function createMockTeam(overrides?: Partial<Team>): Team {
  return {
    id: "team123",
    name: "test-team",
    addedBy: "admin123",
    addedAt: new Date("2023-01-01"),
    ...overrides,
  };
}

export function createMockTeamMember(overrides?: Partial<TeamMember>): TeamMember {
  return {
    userId: "user123",
    teamId: "team123",
    addedBy: "admin123",
    addedAt: new Date("2023-01-01"),
    ...overrides,
  };
}

export function createMockPoll(overrides?: any) {
  return {
    id: 1,
    messageId: "msg123",
    channelId: "channel123",
    creatorId: "user123",
    question: "Test poll question?",
    options: JSON.stringify([
      { text: "Option A", votes: [] },
      { text: "Option B", votes: [] },
    ]),
    endTime: null,
    createdAt: new Date("2023-01-01"),
    ...overrides,
  };
}

export function createMockPollVote(overrides?: any) {
  return {
    pollId: 1,
    userId: "voter123",
    optionIndex: 0,
    votedAt: new Date("2023-01-01"),
    ...overrides,
  };
}
