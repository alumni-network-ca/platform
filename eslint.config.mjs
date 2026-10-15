import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    // Legacy files typed with `any`; FND-01 (#87) replaces them with generated database types.
    files: ["app/profile/[[]id]/page.tsx", "components/ProfileEditor.tsx"],
    rules: { "@typescript-eslint/no-explicit-any": "warn" },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "documentation/**",
  ]),
]);
