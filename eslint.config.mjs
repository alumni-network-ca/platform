import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    // New code uses the clients typed from lib/database.types.ts; the untyped escape is legacy-only.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["@/lib/supabase/client", "@/lib/supabase/server"].map((name) => ({
            name,
            importNames: ["createLegacyClient"],
            message: "Use createClient(): it is typed from the v2 schema.",
          })),
        },
      ],
    },
  },
  {
    // Env vars are read in src/config/env only, so each has one default, one error message and one tier. Tooling runs
    // outside Next (plain Node, Playwright) and keeps its own reads.
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "src/config/env/**",
      "src/tests/unit/config/env/**",
      "src/tests/e2e/**",
      "scripts/**",
      "*.config.{ts,mts}",
    ],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message:
            "Read env vars through @/config/env/public, server or secrets, not process.env directly.",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "docs/diagrams/**",
  ]),
]);
