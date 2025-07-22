import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import { connectApiService } from "./connect-api.service";

describe("Service: connect-api", () => {
  const originalFetch = global.fetch;
  const mockFetch = mock();

  beforeEach(() => {
    // @ts-expect-error - global.fetch is assignable
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("is defined", () => {
    // ASSERT
    expect(connectApiService).toBeDefined();
    expect(connectApiService.getPatchData).toBeDefined();
    expect(connectApiService.getMemAddr).toBeDefined();
    expect(connectApiService.getCodeNotes).toBeDefined();
  });

  describe("getPatchData", () => {
    it("fetches patch data for a game", async () => {
      // ARRANGE
      const mockPatchData = {
        PatchData: {
          Achievements: [
            {
              ID: 123,
              MemAddr: "0xH1234=5",
              Title: "Test Achievement",
              Description: "Test Description",
              Points: 10,
              Author: "TestAuthor",
              Modified: "2024-01-01",
              Created: "2024-01-01",
              BadgeName: "12345",
              Flags: 3,
              Type: null,
              DisplayOrder: 1,
              AssocVideo: null,
              Rarity: 50,
              RarityHardcore: 25,
              TruePoints: 20,
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPatchData,
      });

      // ACT
      const result = await connectApiService.getPatchData(456);

      // ASSERT
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      expect(callArgs?.[0]).toContain("dorequest.php");
      expect(callArgs?.[0]).toContain("r=patch");
      expect(callArgs?.[0]).toContain("g=456");
      expect(result).toEqual(mockPatchData);
    });

    it("handles API errors", async () => {
      // ARRANGE
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // ASSERT
      await expect(connectApiService.getPatchData(456)).rejects.toThrow("HTTP error! status: 500");
    });

    it("handles network errors", async () => {
      // ARRANGE
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      // ASSERT
      await expect(connectApiService.getPatchData(456)).rejects.toThrow("Network error");
    });
  });

  describe("getMemAddr", () => {
    it("extracts MemAddr from patch data", async () => {
      // ARRANGE
      const mockPatchData = {
        PatchData: {
          Achievements: [
            { ID: 123, MemAddr: "0xH1234=5" },
            { ID: 456, MemAddr: "0xH5678=10" },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPatchData,
      });

      // ACT
      const result = await connectApiService.getMemAddr(789, 456);

      // ASSERT
      expect(result).toBe("0xH5678=10");
    });

    it("returns null if achievement not found", async () => {
      // ARRANGE
      const mockPatchData = {
        PatchData: {
          Achievements: [{ ID: 123, MemAddr: "0xH1234=5" }],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPatchData,
      });

      // ACT
      const result = await connectApiService.getMemAddr(789, 999);

      // ASSERT
      expect(result).toBeNull();
    });

    it("returns null on API error", async () => {
      // ARRANGE
      mockFetch.mockRejectedValueOnce(new Error("API Error"));

      // ACT
      const result = await connectApiService.getMemAddr(789, 456);

      // ASSERT
      expect(result).toBeNull();
    });
  });

  describe("getCodeNotes", () => {
    it("should fetch code notes for a game", async () => {
      // ARRANGE
      const mockCodeNotes = {
        CodeNotes: [
          {
            Address: "0x001234",
            Note: "Player health",
            User: "TestUser",
            Created: "2024-01-01",
          },
          {
            Address: "0x005678",
            Note: "Score counter",
            User: "TestUser2",
            Created: "2024-01-02",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCodeNotes,
      });

      // ACT
      const result = await connectApiService.getCodeNotes(456);

      // ASSERT
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      expect(callArgs?.[0]).toContain("dorequest.php");
      expect(callArgs?.[0]).toContain("r=codenotes2");
      expect(callArgs?.[0]).toContain("g=456");
      expect(result).toEqual(mockCodeNotes.CodeNotes);
    });

    it("should return empty array on API error", async () => {
      // ARRANGE
      mockFetch.mockRejectedValueOnce(new Error("API Error"));

      // ACT
      const result = await connectApiService.getCodeNotes(456);

      // ASSERT
      expect(result).toEqual([]);
    });

    it("should handle missing CodeNotes property", async () => {
      // ARRANGE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      // ACT
      const result = await connectApiService.getCodeNotes(456);

      // ASSERT
      expect(result).toEqual([]);
    });
  });

  describe("authentication", () => {
    it("should include username and token in requests", async () => {
      // ARRANGE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ PatchData: { Achievements: [] } }),
      });

      // ACT
      await connectApiService.getPatchData(123);

      // ASSERT
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const url = callArgs?.[0];
      expect(url).toContain("u=RABot");
      expect(url).toContain("t=");
    });
  });
});
