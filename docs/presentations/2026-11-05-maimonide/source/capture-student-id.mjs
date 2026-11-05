// The request form with the optional student ID (PR 279), filled in but not sent, in French and English.
//   node docs/presentations/2026-11-05-maimonide/source/capture-student-id.mjs <out-dir> [port]
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const [OUT, PORT = "3200"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const STACK = "http://127.0.0.1:54321";
const KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const HOST = "maimonide.localhost";
const COOKIE = "sb-127-auth-token";

const browser = await chromium.launch();
for (const lang of ["fr", "en"]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await context.addCookies([{ name: "herzliah-language", value: lang, domain: HOST, path: "/" }]);
  await context.addInitScript((l) => localStorage.setItem("herzliah-language", l), lang);
  const { data, error } = await createClient(STACK, KEY, {
    auth: { persistSession: false },
  }).auth.signInWithPassword({
    email: "nouveau@maimonide.test",
    password: "LocalDev-Passw0rd",
  });
  if (error) throw error;
  const value = `base64-${Buffer.from(JSON.stringify(data.session)).toString("base64url")}`;
  const chunks = value.match(/.{1,3180}/g);
  await context.addCookies(
    chunks.map((c, i) => ({
      name: chunks.length === 1 ? COOKIE : `${COOKIE}.${i}`,
      value: c,
      domain: HOST,
      path: "/",
      sameSite: "Lax",
    })),
  );
  const page = await context.newPage();
  await page.goto(`http://${HOST}:${PORT}/join`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.fill('input[name="first_name"]', "Jonathan");
  await page.fill('input[name="last_name"]', "Azoulay");
  await page.fill('input[name="grad_year"]', "2011");
  await page.fill('input[name="school_student_id"]', "11-0457");
  await page.fill(
    'textarea[name="note"]',
    lang === "fr"
      ? "Dans la classe de Mme Cohen en secondaire 5."
      : "In Mrs. Cohen’s homeroom in my final year.",
  );
  await page.locator('input[name="grad_year"]').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 120));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/a02-request-${lang}.png` });
  console.log(lang, page.url());
  await context.close();
}
await browser.close();
