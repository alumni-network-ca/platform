import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// The app lives in src/. Next silently ignores src/app when an app/ or pages/ folder exists at the root, which a
// checkout from before the move can keep if it holds untracked files: fail loudly instead of serving nothing.
for (const folder of ["app", "pages"]) {
  if (existsSync(path.join(process.cwd(), folder))) {
    throw new Error(
      `Remove the root ${folder}/ folder: the app lives in src/ and Next would ignore src/app.`,
    );
  }
}

const nextConfig: NextConfig = { poweredByHeader: false, experimental: { authInterrupts: true } };
export default nextConfig;
