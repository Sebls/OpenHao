import { builtinModules } from "node:module";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import-x";
export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "data/**"] },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "vite.config.ts"],
    plugins: { "import-x": importPlugin },
    settings: {
      "import-x/resolver": {
        typescript: {
          project: "tsconfig.json",
        },
      },
    },
    rules: {
      "import-x/no-cycle": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/client/**"],
              message: "Node code must not depend on browser modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/client/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "node:*",
                ...builtinModules,
                "**/server/**",
                "**/content/**",
              ],
              message:
                "Browser modules may consume contracts, never Node or preparation code.",
            },
            {
              group: ["**/app/**"],
              message:
                "Features and shared UI must not import the application shell.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/client/main.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "node:*",
                ...builtinModules,
                "**/server/**",
                "**/content/**",
              ],
              message: "The browser entry must not import Node code.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/contracts/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "node:*",
                ...builtinModules,
                "react",
                "**/client/**",
                "**/server/**",
                "**/content/**",
              ],
              message: "Contracts must remain platform independent.",
            },
          ],
        },
      ],
    },
  },
);
