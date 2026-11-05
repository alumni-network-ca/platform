// Screenshots of the Maimonide demo school (local stack only) for the presentation. Not part of the app.
//   node docs/presentations/2026-11-05-maimonide/source/capture-screens.mjs <out-dir> [filter] [--lang en] [--mobile] [--port 3100]
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? fallback : args[i + 1];
};
const OUT = args[0];
const FILTER = args[1] && !args[1].startsWith("--") ? args[1] : null;
const LANG = flag("lang", "fr");
const MOBILE = args.includes("--mobile");
const PORT = flag("port", "3100");
if (!OUT) throw new Error("Pass the output folder.");
mkdirSync(OUT, { recursive: true });

const STACK = "http://127.0.0.1:54321";
const KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const HOST = "maimonide.localhost";
const BASE = `http://${HOST}:${PORT}`;
const COOKIE = `sb-${new URL(STACK).hostname.split(".")[0]}-auth-token`;
const CHUNK = 3180;

async function signIn(context, email) {
  const supabase = createClient(STACK, KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: "LocalDev-Passw0rd",
  });
  if (error || !data.session) throw new Error(`Could not sign in ${email}: ${error?.message}`);
  const value = `base64-${Buffer.from(JSON.stringify(data.session)).toString("base64url")}`;
  const chunks = value.match(new RegExp(`.{1,${CHUNK}}`, "g")) ?? [];
  await context.addCookies(
    chunks.map((chunk, i) => ({
      name: chunks.length === 1 ? COOKIE : `${COOKIE}.${i}`,
      value: chunk,
      domain: HOST,
      path: "/",
      sameSite: "Lax",
    })),
  );
}

const ELIE = "00000000-d001-4000-8000-000000000002";
const DEBORAH_REQUEST = "33333333-d001-4333-8333-000000000001";

// [name, account (null = signed out), path, extra step]
const shots = [
  ["a01-join", null, "/join"],
  ["a01b-login", null, "/login"],
  ["a02-request", "nouveau@maimonide.test", "/join"],
  ["a03-pending", "pending@maimonide.test", "/account/pending"],
  ["a03b-needsinfo", "needsinfo@maimonide.test", "/account/needs-info"],
  ["a04-onb-welcome", "newmember@maimonide.test", "/onboarding/welcome"],
  ["a04-onb-about", "newmember@maimonide.test", "/onboarding/about"],
  ["a04-onb-career", "newmember@maimonide.test", "/onboarding/career"],
  ["a04-onb-networking", "newmember@maimonide.test", "/onboarding/networking"],
  ["a04-onb-contact", "newmember@maimonide.test", "/onboarding/contact"],
  ["a04-onb-publish", "newmember@maimonide.test", "/onboarding/publish"],
  ["a05-home", "alumni@maimonide.test", "/home"],
  ["a06-directory", "alumni@maimonide.test", "/directory"],
  ["a06b-directory-mentoring", "alumni@maimonide.test", "/directory?offer=mentoring"],
  ["a07-profile", "alumni@maimonide.test", `/profile/${ELIE}`],
  [
    "a07b-profile-revealed",
    "alumni@maimonide.test",
    `/profile/${ELIE}`,
    (page) => page.getByRole("button", { name: /Afficher le courriel|Show email/ }).click(),
  ],
  ["a08-me", "alumni@maimonide.test", "/me"],
  ["a08b-visibility", "alumni@maimonide.test", "/me/visibility"],
  ["s01-dashboard", "admin@maimonide.test", "/admin"],
  ["s02-approvals", "admin@maimonide.test", "/admin/approvals"],
  ["s03-review", "admin@maimonide.test", `/admin/approvals/${DEBORAH_REQUEST}`],
  ["s04-roster", "admin@maimonide.test", "/admin/alumni"],
  ["s05-record", "admin@maimonide.test", `/admin/alumni/${ELIE}`],
  ["s05b-status", "admin@maimonide.test", `/admin/alumni/${ELIE}/status`],
  ["s06-staff", "admin@maimonide.test", "/admin/staff"],
  ["s06b-invite", "admin@maimonide.test", "/admin/staff/invite"],
  ["s07-settings", "admin@maimonide.test", "/admin/settings"],
  ["s08-templates", "admin@maimonide.test", `/admin/templates?locale=${LANG}`],
  ["s09-audit", "admin@maimonide.test", "/admin/audit"],
  ["r01-dashboard", "reviewer@maimonide.test", "/admin"],
  ["r02-approvals", "reviewer@maimonide.test", "/admin/approvals"],
];

const browser = await chromium.launch();
try {
  for (const [name, account, path, action] of shots) {
    if (FILTER && !name.includes(FILTER)) continue;
    const context = await browser.newContext(
      MOBILE
        ? {
            viewport: { width: 390, height: 844 },
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
          }
        : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
    );
    await context.addCookies([{ name: "herzliah-language", value: LANG, domain: HOST, path: "/" }]);
    // The client-side language comes from localStorage (LanguageProvider), the server's from the cookie.
    await context.addInitScript((lang) => localStorage.setItem("herzliah-language", lang), LANG);
    if (account) await signIn(context, account);
    const page = await context.newPage();
    const response = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 120_000 });
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    if (action) {
      await action(page);
      await page.waitForLoadState("networkidle");
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    await page.screenshot({ path: `${OUT}/${name}-full.png`, fullPage: true });
    console.log(`${name}  ${response?.status()}  ${page.url()}`);
    await context.close();
  }
} finally {
  await browser.close();
}
