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
    // Pages and components still on the legacy schema. Each one names the M2 issue that rewires it;
    // remove it from this list in that PR.
    files: [
      "app/admin/page.tsx",
      "app/claim/page.tsx",
      "app/me/page.tsx",
      "app/onboarding/page.tsx",
      "app/profile/[[]id]/page.tsx",
      "app/request-access/page.tsx",
      "components/AdminImport.tsx",
      "components/ContactAlumnusButton.tsx",
      "components/OnboardingClient.tsx",
      "components/ProfileEditor.tsx",
    ],
    rules: { "no-restricted-imports": "off" },
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
