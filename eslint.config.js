import eslint from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sortKeysShorthand from "eslint-plugin-sort-keys-shorthand";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**"],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,

  importPlugin.flatConfigs.recommended,

  {
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
      },
    },

    plugins: {
      "@typescript-eslint": tseslint.plugin,
      prettier,
      "simple-import-sort": simpleImportSort,
      unicorn,
      "sort-keys-shorthand": sortKeysShorthand,
    },

    settings: {
      "import/resolver": {
        typescript: {},
      },
    },

    rules: {
      "no-unused-vars": "off", // @typescript-eslint/no-unused-vars handles this better.
      "max-len": "off",
      "prefer-destructuring": "off",
      "no-undef": "off", // TypeScript handles undefined variables.
      "no-eval": "off", // Legacy code uses eval in some places.
      "no-console": "off", // Console is allowed for debugging.
      "no-plusplus": "off",
      "comma-dangle": "off",
      eqeqeq: "error",
      "func-names": "off",
      "no-alert": "off", // Still using confirm() dialogs in some places.
      "no-else-return": "error",
      "no-loop-func": "off",
      "no-param-reassign": "off",
      "no-restricted-globals": "off", // Allows confirm() and other browser globals.
      "no-return-await": "error",
      "no-shadow": "off", // TypeScript's no-shadow handles this better.
      "no-use-before-define": "off",
      "no-useless-escape": "off", // False positives with regex patterns.
      "no-var": "off", // Legacy jQuery code still uses var.
      "object-shorthand": "error",
      "prefer-arrow-callback": "off",
      "prefer-rest-params": "off",
      "prefer-template": "off",
      "vars-on-top": "off",
      "global-require": "off",
      "newline-before-return": "error",
      camelcase: "off",
      "no-constant-condition": ["warn", { checkLoops: true }],

      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-var-requires": "error",
      "@typescript-eslint/ban-ts-comment": "warn",

      // Override import plugin rules that were set by flatConfigs.recommended.
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
      "import/no-unresolved": [
        "error",
        {
          ignore: ["^.*/vendor/.*"], // CI can't see these files.
        },
      ],
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": "error",

      "unicorn/filename-case": "off",
      "unicorn/no-array-callback-reference": "off",
      "unicorn/no-array-for-each": "warn",
      "unicorn/no-array-reduce": "error",
      "unicorn/no-null": "off",
      "unicorn/prefer-includes": "error",
      "unicorn/prefer-module": "off",
      "unicorn/prefer-node-protocol": "off",
      "unicorn/prefer-switch": "off",

      "prettier/prettier": [
        "error",
        {
          tabWidth: 2,
          printWidth: 100,
        },
      ],
    },
  }
);
