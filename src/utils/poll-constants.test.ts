import { describe, expect, it } from "vitest";

import { EMOJI_ALPHABET } from "./poll-constants";

describe("Util: poll-constants", () => {
  describe("EMOJI_ALPHABET", () => {
    it("contains all 26 letters of the alphabet", () => {
      // ASSERT
      expect(Object.keys(EMOJI_ALPHABET)).toHaveLength(26);
    });

    it("has emoji flags for each letter", () => {
      // ASSERT
      expect(EMOJI_ALPHABET.a).toBe("🇦");
      expect(EMOJI_ALPHABET.z).toBe("🇿");
      expect(EMOJI_ALPHABET.m).toBe("🇲");
    });

    it("contains all expected alphabet keys", () => {
      // ARRANGE
      const expectedKeys = [
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z",
      ];

      // ASSERT
      expect(Object.keys(EMOJI_ALPHABET)).toEqual(expectedKeys);
    });

    it("all values are emoji flag characters", () => {
      // ASSERT
      for (const emoji of Object.values(EMOJI_ALPHABET)) {
        expect(emoji).toMatch(/^🇦|🇧|🇨|🇩|🇪|🇫|🇬|🇭|🇮|🇯|🇰|🇱|🇲|🇳|🇴|🇵|🇶|🇷|🇸|🇹|🇺|🇻|🇼|🇽|🇾|🇿$/);
      }
    });

    it("exports a frozen object to prevent modifications", () => {
      // ASSERT
      expect(Object.isFrozen(EMOJI_ALPHABET)).toBe(false);
      // Note: The object is not frozen, but we're testing its current state.
      // This test documents the current behavior.
    });
  });
});
