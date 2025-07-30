import { mock } from "bun:test";

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

/**
 * Applies database method mocks conditionally - only mocks methods that don't exist.
 * This is useful for CI environments where Drizzle methods may be undefined.
 *
 * @param dbInstance - The database instance to potentially mock
 * @param mockData - Optional mock data to return from database operations
 */
export const applyConditionalDbMocks = (dbInstance: any, mockData?: any) => {
  // Mock database storage to simulate real database behavior.
  const mockStorage = new Map();
  let idCounter = 1;

  const _defaultMockData = {
    id: 1,
    messageId: "123456789",
    channelId: "987654321",
    status: "active",
    startedAt: new Date(),
    endedAt: null,
    ...mockData,
  };

  const mockDbMethods = {
    transaction: mock(async (callback: any) => callback(dbInstance)),
    delete: mock(() => ({
      where: mock(() => {
        mockStorage.clear();

        return Promise.resolve();
      }),
    })),
    insert: mock(() => ({
      values: mock((data: any) => ({
        returning: mock(() => {
          const newRecord = Array.isArray(data) ? data[0] : data;
          const recordWithId = {
            id: idCounter++,
            ...newRecord,
            startedAt: new Date(),
            status: newRecord.status || "active",
          };
          mockStorage.set(recordWithId.messageId || recordWithId.id, recordWithId);

          return Promise.resolve([recordWithId]);
        }),
      })),
    })),
    select: mock(() => ({
      from: mock(() => ({
        where: mock((_condition: any) => {
          // Try to extract messageId from condition for more realistic behavior.
          const records = Array.from(mockStorage.values());

          return Promise.resolve(records);
        }),
        orderBy: mock(() => {
          const records = Array.from(mockStorage.values());

          return Promise.resolve(records);
        }),
      })),
    })),
    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() => {
            const records = Array.from(mockStorage.values());
            const updatedRecords = records.map((record) => ({
              ...record,
              status: "completed",
              endedAt: new Date(),
            }));

            return Promise.resolve(updatedRecords);
          }),
        })),
      })),
    })),
  };

  // Only mock methods that don't exist (CI environment).
  for (const [method, mockFn] of Object.entries(mockDbMethods)) {
    if (!dbInstance[method]) {
      dbInstance[method] = mockFn;
    }
  }

  return dbInstance;
};

// Legacy mock database instance for testing (kept for backward compatibility).
export const createMockDb = () => {
  const mockTransactionFn = mock(async (callback: any) => {
    // Execute the callback with a mock transaction object.
    return callback({
      select: mock(() => ({ from: mock(() => ({ where: mock(() => []) })) })),
      insert: mock(() => ({ values: mock(() => ({ returning: mock(() => []) })) })),
      update: mock(() => ({
        set: mock(() => ({ where: mock(() => ({ returning: mock(() => []) })) })),
      })),
      delete: mock(() => ({ where: mock(() => []) })),
    });
  });

  return {
    select: mock(() => ({ from: mock(() => ({ where: mock(() => []) })) })),
    insert: mock(() => ({ values: mock(() => ({ returning: mock(() => []) })) })),
    update: mock(() => ({
      set: mock(() => ({ where: mock(() => ({ returning: mock(() => []) })) })),
    })),
    delete: mock(() => ({ where: mock(() => []) })),
    transaction: mockTransactionFn,
    run: mock(() => Promise.resolve()),
  };
};
