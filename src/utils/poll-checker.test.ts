import { ChannelType, Collection, type Poll, type PollAnswer } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UWC_VOTE_CONCLUDED_TAG_ID, UWC_VOTING_TAG_ID } from "../config/constants";
import { UwcPollService } from "../services/uwc-poll.service";
import {
  createMockClient,
  createMockMessage,
  createMockTextChannel,
  createMockThreadChannel,
} from "../test/mocks/discord.mock";
import { checkExpiredUwcPolls } from "./poll-checker";

// Mock the UwcPollService
vi.mock("../services/uwc-poll.service");

// Mock the logger
vi.mock("./logger", () => ({
  logger: {
    info: vi.fn(),
  },
  logError: vi.fn(),
}));

// Mock constants to ensure they're defined for tests
vi.mock("../config/constants", () => ({
  UWC_VOTING_TAG_ID: "voting-tag-123",
  UWC_VOTE_CONCLUDED_TAG_ID: "concluded-tag-456",
}));

// Helper to create UWC poll mock objects with proper typing
function createMockUwcPoll(overrides: any = {}) {
  return {
    id: 1,
    messageId: "poll-msg-123",
    channelId: "channel-123",
    threadId: null,
    creatorId: "creator-123",
    achievementId: null,
    achievementName: null,
    gameId: null,
    gameName: null,
    pollUrl: "https://example.com/poll",
    startedAt: new Date(),
    endedAt: null,
    status: "active",
    ...overrides,
  };
}

describe("Util: poll-checker", () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient({
      channels: {
        cache: new Collection(),
        fetch: vi.fn(),
      } as any,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("checkExpiredUwcPolls", () => {
    it("handles no active polls gracefully", async () => {
      // ARRANGE
      vi.mocked(UwcPollService.getActiveUwcPolls).mockResolvedValue([]);

      // ACT
      await checkExpiredUwcPolls(mockClient as any);

      // ASSERT
      expect(UwcPollService.getActiveUwcPolls).toHaveBeenCalled();
      expect(mockClient.channels.fetch).not.toHaveBeenCalled();
    });

    it("successfully processes expired polls", async () => {
      // ARRANGE
      const mockActivePoll = createMockUwcPoll();

      const mockPollAnswer1 = {
        id: 1,
        text: "Option 1",
        voteCount: 5,
      } as PollAnswer;

      const mockPollAnswer2 = {
        id: 2,
        text: "Option 2",
        voteCount: 3,
      } as PollAnswer;

      const mockPoll = {
        resultsFinalized: true,
        answers: new Collection([
          [1, mockPollAnswer1],
          [2, mockPollAnswer2],
        ]),
      } as Poll;

      const mockMessage = createMockMessage({
        id: "poll-msg-123",
        poll: mockPoll,
      });

      const mockChannel = createMockTextChannel({
        id: "channel-123",
        isTextBased: vi.fn().mockReturnValue(true),
      } as any);
      mockChannel.messages = {
        fetch: vi.fn().mockResolvedValue(mockMessage),
      } as any;

      vi.mocked(UwcPollService.getActiveUwcPolls).mockResolvedValue([mockActivePoll]);
      vi.mocked(mockClient.channels.fetch).mockResolvedValue(mockChannel);

      // ACT
      await checkExpiredUwcPolls(mockClient as any);

      // ASSERT
      expect(UwcPollService.getActiveUwcPolls).toHaveBeenCalled();
      expect(mockClient.channels.fetch).toHaveBeenCalledWith("channel-123");
      expect(mockChannel.messages.fetch).toHaveBeenCalledWith("poll-msg-123");
      expect(UwcPollService.completeUwcPoll).toHaveBeenCalledWith("poll-msg-123", [
        {
          optionText: "Option 1",
          voteCount: 5,
          votePercentage: 62.5,
        },
        {
          optionText: "Option 2",
          voteCount: 3,
          votePercentage: 37.5,
        },
      ]);
    });

    it("skips polls that are still active", async () => {
      // ARRANGE
      const mockActivePoll = createMockUwcPoll();

      const mockPoll = {
        resultsFinalized: false,
        answers: new Collection(),
      } as Poll;

      const mockMessage = createMockMessage({
        id: "poll-msg-123",
        poll: mockPoll,
      });

      const mockChannel = createMockTextChannel({
        id: "channel-123",
        isTextBased: vi.fn().mockReturnValue(true),
      } as any);
      mockChannel.messages = {
        fetch: vi.fn().mockResolvedValue(mockMessage),
      } as any;

      vi.mocked(UwcPollService.getActiveUwcPolls).mockResolvedValue([mockActivePoll]);
      vi.mocked(mockClient.channels.fetch).mockResolvedValue(mockChannel);

      // ACT
      await checkExpiredUwcPolls(mockClient as any);

      // ASSERT
      expect(UwcPollService.completeUwcPoll).not.toHaveBeenCalled();
    });

    it("handles missing channels gracefully", async () => {
      // ARRANGE
      const mockActivePoll = createMockUwcPoll({
        channelId: "missing-channel",
      });

      vi.mocked(UwcPollService.getActiveUwcPolls).mockResolvedValue([mockActivePoll]);
      vi.mocked(mockClient.channels.fetch).mockResolvedValue(null);

      // ACT
      await checkExpiredUwcPolls(mockClient as any);

      // ASSERT
      expect(UwcPollService.completeUwcPoll).not.toHaveBeenCalled();
    });

    it("handles non-text channels gracefully", async () => {
      // ARRANGE
      const mockActivePoll = createMockUwcPoll({
        channelId: "voice-channel",
      });

      const mockVoiceChannel = {
        id: "voice-channel",
        type: ChannelType.GuildVoice,
        isTextBased: vi.fn().mockReturnValue(false),
      } as any;

      vi.mocked(UwcPollService.getActiveUwcPolls).mockResolvedValue([mockActivePoll]);
      vi.mocked(mockClient.channels.fetch).mockResolvedValue(mockVoiceChannel);

      // ACT
      await checkExpiredUwcPolls(mockClient as any);

      // ASSERT
      expect(UwcPollService.completeUwcPoll).not.toHaveBeenCalled();
    });

    it("handles missing messages gracefully", async () => {
      // ARRANGE
      const mockActivePoll = createMockUwcPoll({
        messageId: "missing-msg-123",
      });

      const mockChannel = createMockTextChannel({
        id: "channel-123",
        isTextBased: vi.fn().mockReturnValue(true),
      } as any);
      mockChannel.messages = {
        fetch: vi.fn().mockRejectedValue(new Error("Unknown Message")),
      } as any;

      vi.mocked(UwcPollService.getActiveUwcPolls).mockResolvedValue([mockActivePoll]);
      vi.mocked(mockClient.channels.fetch).mockResolvedValue(mockChannel);

      // ACT
      await checkExpiredUwcPolls(mockClient as any);

      // ASSERT
      expect(UwcPollService.completeUwcPoll).not.toHaveBeenCalled();
    });

    it("handles messages without polls gracefully", async () => {
      // ARRANGE
      const mockActivePoll = createMockUwcPoll({
        messageId: "no-poll-msg-123",
      });

      const mockMessage = createMockMessage({
        id: "no-poll-msg-123",
        poll: null,
      });

      const mockChannel = createMockTextChannel({
        id: "channel-123",
        isTextBased: vi.fn().mockReturnValue(true),
      } as any);
      mockChannel.messages = {
        fetch: vi.fn().mockResolvedValue(mockMessage),
      } as any;

      vi.mocked(UwcPollService.getActiveUwcPolls).mockResolvedValue([mockActivePoll]);
      vi.mocked(mockClient.channels.fetch).mockResolvedValue(mockChannel);

      // ACT
      await checkExpiredUwcPolls(mockClient as any);

      // ASSERT
      expect(UwcPollService.completeUwcPoll).not.toHaveBeenCalled();
    });

    it("calculates poll percentages correctly when total votes is zero", async () => {
      // ARRANGE
      const mockActivePoll = createMockUwcPoll();

      const mockPollAnswer1 = {
        id: 1,
        text: "Option 1",
        voteCount: 0,
      } as PollAnswer;

      const mockPoll = {
        resultsFinalized: true,
        answers: new Collection([[1, mockPollAnswer1]]),
      } as Poll;

      const mockMessage = createMockMessage({
        id: "poll-msg-123",
        poll: mockPoll,
      });

      const mockChannel = createMockTextChannel({
        id: "channel-123",
        isTextBased: vi.fn().mockReturnValue(true),
      } as any);
      mockChannel.messages = {
        fetch: vi.fn().mockResolvedValue(mockMessage),
      } as any;

      vi.mocked(UwcPollService.getActiveUwcPolls).mockResolvedValue([mockActivePoll]);
      vi.mocked(mockClient.channels.fetch).mockResolvedValue(mockChannel);

      // ACT
      await checkExpiredUwcPolls(mockClient as any);

      // ASSERT
      expect(UwcPollService.completeUwcPoll).toHaveBeenCalledWith("poll-msg-123", [
        {
          optionText: "Option 1",
          voteCount: 0,
          votePercentage: 0,
        },
      ]);
    });

    it("skips poll answers without text", async () => {
      // ARRANGE
      const mockActivePoll = createMockUwcPoll();

      const mockPollAnswer1 = {
        id: 1,
        text: "Option 1",
        voteCount: 5,
      } as PollAnswer;

      const mockPollAnswer2 = {
        id: 2,
        text: null, // No text - should be skipped
        voteCount: 3,
      } as PollAnswer;

      const mockPoll = {
        resultsFinalized: true,
        answers: new Collection([
          [1, mockPollAnswer1],
          [2, mockPollAnswer2],
        ]),
      } as Poll;

      const mockMessage = createMockMessage({
        id: "poll-msg-123",
        poll: mockPoll,
      });

      const mockChannel = createMockTextChannel({
        id: "channel-123",
        isTextBased: vi.fn().mockReturnValue(true),
      } as any);
      mockChannel.messages = {
        fetch: vi.fn().mockResolvedValue(mockMessage),
      } as any;

      vi.mocked(UwcPollService.getActiveUwcPolls).mockResolvedValue([mockActivePoll]);
      vi.mocked(mockClient.channels.fetch).mockResolvedValue(mockChannel);

      // ACT
      await checkExpiredUwcPolls(mockClient as any);

      // ASSERT
      expect(UwcPollService.completeUwcPoll).toHaveBeenCalledWith("poll-msg-123", [
        {
          optionText: "Option 1",
          voteCount: 5,
          votePercentage: 62.5, // 5 votes out of 8 total (5+3)
        },
      ]);
    });

    it("updates thread tags for forum threads when poll is completed", async () => {
      // ARRANGE
      const mockActivePoll = createMockUwcPoll({
        channelId: "thread-123",
        threadId: "thread-123",
      });

      const mockPollAnswer = {
        id: 1,
        text: "Option 1",
        voteCount: 5,
      } as PollAnswer;

      const mockPoll = {
        resultsFinalized: true,
        answers: new Collection([[1, mockPollAnswer]]),
      } as Poll;

      const mockMessage = createMockMessage({
        id: "poll-msg-123",
        poll: mockPoll,
      });

      const mockThread = createMockThreadChannel({
        id: "thread-123",
        type: ChannelType.PublicThread,
        appliedTags: [UWC_VOTING_TAG_ID!, "other-tag-789"],
        setAppliedTags: vi.fn().mockResolvedValue(undefined),
        isTextBased: vi.fn().mockReturnValue(true),
      });
      mockThread.messages = {
        fetch: vi.fn().mockResolvedValue(mockMessage),
      } as any;

      vi.mocked(UwcPollService.getActiveUwcPolls).mockResolvedValue([mockActivePoll]);
      vi.mocked(mockClient.channels.fetch).mockResolvedValue(mockThread);

      // ACT
      await checkExpiredUwcPolls(mockClient as any);

      // ASSERT
      expect(UwcPollService.completeUwcPoll).toHaveBeenCalledWith(
        "poll-msg-123",
        expect.any(Array),
      );
      expect(mockThread.setAppliedTags).toHaveBeenCalledWith([
        "other-tag-789",
        UWC_VOTE_CONCLUDED_TAG_ID!,
      ]);
    });

    it("handles thread tag update errors gracefully", async () => {
      // ARRANGE
      const mockActivePoll = createMockUwcPoll({
        channelId: "thread-123",
        threadId: "thread-123",
      });

      const mockPollAnswer = {
        id: 1,
        text: "Option 1",
        voteCount: 5,
      } as PollAnswer;

      const mockPoll = {
        resultsFinalized: true,
        answers: new Collection([[1, mockPollAnswer]]),
      } as Poll;

      const mockMessage = createMockMessage({
        id: "poll-msg-123",
        poll: mockPoll,
      });

      const mockThread = createMockThreadChannel({
        id: "thread-123",
        type: ChannelType.PublicThread,
        appliedTags: [UWC_VOTING_TAG_ID!],
        setAppliedTags: vi.fn().mockRejectedValue(new Error("Permission denied")),
        isTextBased: vi.fn().mockReturnValue(true),
      });
      mockThread.messages = {
        fetch: vi.fn().mockResolvedValue(mockMessage),
      } as any;

      vi.mocked(UwcPollService.getActiveUwcPolls).mockResolvedValue([mockActivePoll]);
      vi.mocked(mockClient.channels.fetch).mockResolvedValue(mockThread);

      // ACT
      await checkExpiredUwcPolls(mockClient as any);

      // ASSERT
      expect(UwcPollService.completeUwcPoll).toHaveBeenCalled();
      // Should not throw even though tag update failed
    });

    it("handles main function errors gracefully", async () => {
      // ARRANGE
      vi.mocked(UwcPollService.getActiveUwcPolls).mockRejectedValue(new Error("Database error"));

      // ACT
      await checkExpiredUwcPolls(mockClient as any);

      // ASSERT
      // Should not throw even though database call failed
      expect(UwcPollService.getActiveUwcPolls).toHaveBeenCalled();
    });

    it("processes multiple polls correctly", async () => {
      // ARRANGE
      const mockActivePolls = [
        createMockUwcPoll({
          messageId: "poll-msg-1",
          channelId: "channel-1",
        }),
        createMockUwcPoll({
          messageId: "poll-msg-2",
          channelId: "channel-2",
        }),
      ];

      const createMockPollSetup = (messageId: string, channelId: string, expired: boolean) => {
        const mockPoll = {
          resultsFinalized: expired,
          answers: new Collection([[1, { id: 1, text: "Option", voteCount: 1 } as PollAnswer]]),
        } as Poll;

        const mockMessage = createMockMessage({
          id: messageId,
          poll: mockPoll,
        });

        const mockChannel = createMockTextChannel({
          id: channelId,
          isTextBased: vi.fn().mockReturnValue(true),
        } as any);
        mockChannel.messages = {
          fetch: vi.fn().mockResolvedValue(mockMessage),
        } as any;

        return { mockChannel, mockMessage };
      };

      const { mockChannel: channel1 } = createMockPollSetup("poll-msg-1", "channel-1", true);
      const { mockChannel: channel2 } = createMockPollSetup("poll-msg-2", "channel-2", false);

      vi.mocked(UwcPollService.getActiveUwcPolls).mockResolvedValue(mockActivePolls);
      vi.mocked(mockClient.channels.fetch)
        .mockResolvedValueOnce(channel1)
        .mockResolvedValueOnce(channel2);

      // ACT
      await checkExpiredUwcPolls(mockClient as any);

      // ASSERT
      expect(mockClient.channels.fetch).toHaveBeenCalledTimes(2);
      expect(UwcPollService.completeUwcPoll).toHaveBeenCalledTimes(1);
      expect(UwcPollService.completeUwcPoll).toHaveBeenCalledWith("poll-msg-1", expect.any(Array));
    });
  });
});
