import nkzw from "@nkzw/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [nkzw],
  ignorePatterns: ["dist/**"],
  rules: {
    // Core rules.
    eqeqeq: "error",
    "no-console": "off",
    "no-else-return": "error",
    "no-return-await": "error",
    "object-shorthand": "error",

    // TypeScript rules.
    "@typescript-eslint/ban-ts-comment": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],

    // Unicorn rules.
    "unicorn/no-array-reduce": "error",
    "unicorn/prefer-includes": "error",
    "unicorn/prefer-node-protocol": "off",

    // Import sorting.
    "perfectionist/sort-imports": "error",
    "perfectionist/sort-named-imports": "error",

    // Not relevant for this project.
    "@nkzw/ensure-relay-types": "off",
    "@nkzw/require-use-effect-arguments": "off",
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/test/**/*.ts", "**/*.mock.ts"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
});
