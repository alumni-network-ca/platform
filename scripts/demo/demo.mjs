// Self-driving demo of the Maïmonide alumni network, end to end, on the LOCAL stack (fictional data only).
//
//   node scripts/demo/demo.mjs --check              preflight only: is everything up, do the pages load?
//   node scripts/demo/demo.mjs                      preflight, then the full demo in a visible browser (French)
//   node scripts/demo/demo.mjs --lang en            the same in English
//   node scripts/demo/demo.mjs --manual             waits for the → key (in the browser) before each scene
//   node scripts/demo/demo.mjs --record             also saves a video in scripts/demo/videos/ (git-ignored)
//   node scripts/demo/demo.mjs --setup              loads the Maïmonide demo data if the database lacks it
//   --port 3000 (default)  --headless  --skip-check
//
// It drives the real app: a new graduate signs up, confirms the email (read from Mailpit), asks for access, a
// reviewer approves, the graduate builds and publishes a profile, finds a mentor and reveals an email, then the
// school admin sees the new member and the audit log. Each run uses a new applicant.
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const args = process.argv.slice(2);
const has = (f) => args.includes(`--${f}`);
const opt = (f, d) => (args.indexOf(`--${f}`) >= 0 ? args[args.indexOf(`--${f}`) + 1] : d);
const LANG = opt("lang", "fr") === "en" ? "en" : "fr";
const PORT = opt("port", "3000");
const HOST = "maimonide.localhost";
const BASE = `http://${HOST}:${PORT}`;
const SCHOOL = "aaaaaaaa-0000-4000-8000-00000000d001";
const PASSWORD = "LocalDev-Passw0rd"; // the local stack's seed password (supabase/seed.sql), never a real one
const ELIE = "00000000-d001-4000-8000-000000000002";
const fr = LANG === "fr";

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

// ---- Local stack --------------------------------------------------------------------------------------------
function stack() {
  try {
    const out = execSync("supabase status -o json", {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
    const json = JSON.parse(out.slice(out.indexOf("{")));
    return {
      url: json.API_URL,
      publishable: json.PUBLISHABLE_KEY,
      secret: json.SECRET_KEY,
      mailpit: json.MAILPIT_URL,
    };
  } catch {
    return null;
  }
}

// ---- Preflight ---------------------------------------------------------------------------------------------
async function preflight(s) {
  const results = [];
  const check = async (label, fn, fix) => {
    try {
      const detail = await fn();
      results.push(true);
      console.log(`  ${green("✓")} ${label}${detail ? dim(`  ${detail}`) : ""}`);
    } catch (e) {
      results.push(false);
      console.log(`  ${red("✗")} ${label}  ${red(e.message)}${fix ? `\n      → ${fix}` : ""}`);
    }
  };
  console.log("\nPreflight\n");
  await check(
    "Docker and the local Supabase stack",
    async () => {
      if (!s) throw new Error("supabase status failed");
      const r = await fetch(`${s.url}/auth/v1/health`, { headers: { apikey: s.publishable } });
      if (!r.ok) throw new Error(`auth health ${r.status}`);
    },
    "Start Docker Desktop, then run `supabase start` in the repository.",
  );
  if (!s) return false;
  await check(
    "Mailpit (catches the confirmation email)",
    async () => {
      const r = await fetch(`${s.mailpit}/api/v1/info`);
      if (!r.ok) throw new Error(`status ${r.status}`);
    },
    "`supabase start` starts it.",
  );
  const admin = createClient(s.url, s.secret, { auth: { persistSession: false } });
  await check(
    "Maïmonide demo data",
    async () => {
      const { count, error } = await admin
        .from("alumni_profiles")
        .select("id", { count: "exact", head: true })
        .eq("institution_id", SCHOOL)
        .eq("visibility", "members");
      if (error) throw new Error(error.message);
      if (!count || count < 100) throw new Error(`${count ?? 0} published alumni`);
      return `${count} published alumni`;
    },
    "Run with --setup to load scripts/demo/maimonide-demo.sql.",
  );
  const browser = await chromium.launch();
  // Through the browser: Node does not resolve *.localhost, Chrome does.
  await check(
    `The app at ${BASE}, in ${fr ? "French" : "English"}`,
    async () => {
      const context = await newContext(browser, { headless: true });
      const page = await context.newPage();
      const r = await page
        .goto(`${BASE}/join`, { waitUntil: "networkidle", timeout: 60_000 })
        .catch(() => null);
      if (!r) throw new Error("no answer");
      if (!r.ok()) throw new Error(`status ${r.status()}`);
      if (!(await page.content()).includes("Maïmonide"))
        throw new Error("the page does not show Maïmonide");
      const heading = fr ? "Créez votre compte" : "Create your account";
      if (!(await page.getByRole("heading", { name: heading }).count()))
        throw new Error(`no "${heading}" heading`);
      await context.close();
    },
    "In this worktree: `npm run dev` (its .env.local points at the local stack).",
  );
  const pages = [
    [null, ["/join", "/login"]],
    ["alumni@maimonide.test", ["/home", "/directory", `/profile/${ELIE}`, "/me"]],
    ["reviewer@maimonide.test", ["/admin", "/admin/approvals"]],
    [
      "admin@maimonide.test",
      [
        "/admin",
        "/admin/approvals",
        "/admin/alumni",
        "/admin/staff",
        "/admin/settings",
        "/admin/audit",
      ],
    ],
  ];
  for (const [account, paths] of pages) {
    await check(`${account ?? "Visitor"}: ${paths.join(" ")}`, async () => {
      const context = await newContext(browser, { headless: true });
      if (account) await signInto(context, s, account);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      for (const p of paths) {
        const r = await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 60_000 });
        if (!r || r.status() >= 400) throw new Error(`${p} answered ${r?.status()}`);
        if (new URL(page.url()).pathname !== p.split("?")[0])
          throw new Error(`${p} went to ${new URL(page.url()).pathname}`);
      }
      if (errors.length) throw new Error(`script error: ${errors[0]}`);
      await context.close();
    });
  }
  await browser.close();
  const ok = results.every(Boolean);
  console.log(
    ok ? green("\nAll checks passed.\n") : red("\nSome checks failed: fix them before the demo.\n"),
  );
  return ok;
}

function setup() {
  const sql = path.join(HERE, "maimonide-demo.sql");
  console.log("Loading the Maïmonide demo data…");
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_alumni-network",
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
    ],
    { input: readFileSync(sql), stdio: ["pipe", "inherit", "inherit"] },
  );
}

// ---- Browser helpers ---------------------------------------------------------------------------------------
const COOKIE = "sb-127-auth-token";
async function newContext(browser, { headless, record } = {}) {
  const context = await browser.newContext({
    viewport: headless || record ? { width: 1440, height: 900 } : null,
    ...(record
      ? { recordVideo: { dir: path.join(HERE, "videos"), size: { width: 1440, height: 900 } } }
      : {}),
  });
  await context.addCookies([{ name: "herzliah-language", value: LANG, domain: HOST, path: "/" }]);
  // The client components read the language from localStorage (LanguageProvider), the server from the cookie.
  await context.addInitScript((lang) => localStorage.setItem("herzliah-language", lang), LANG);
  return context;
}
async function writeSession(context, session) {
  await context.clearCookies({ name: new RegExp(`^${COOKIE}(\\.\\d+)?$`) });
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const chunks = value.match(/.{1,3180}/g);
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
async function signInto(context, s, email) {
  const client = createClient(s.url, s.publishable, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session) throw new Error(`could not sign in ${email}: ${error?.message}`);
  await writeSession(context, data.session);
}
const sessionCookies = async (context) =>
  (await context.cookies()).filter((c) => c.name.startsWith(COOKIE));
async function restore(context, cookies) {
  await context.clearCookies({ name: new RegExp(`^${COOKIE}(\\.\\d+)?$`) });
  await context.addCookies(cookies);
}

async function confirmationLink(s, email) {
  const search = `${s.mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`;
  for (let i = 0; i < 60; i++) {
    const { messages } = await (await fetch(search)).json();
    for (const m of messages ?? []) {
      const { HTML } = await (await fetch(`${s.mailpit}/api/v1/message/${m.ID}`)).json();
      const link = [...(HTML ?? "").matchAll(/href="([^"]+)"/g)]
        .map((x) => x[1].replaceAll("&amp;", "&"))
        .find((l) => l.includes("/auth/confirm?") && l.includes("flow=signup"));
      if (link) {
        const u = new URL(link);
        return BASE + u.pathname + u.search; // the same link, on the address the demo runs on
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no confirmation email for ${email}`);
}

// Overlay: a visible cursor, a caption bar and the hidden Next.js dev badge, kept across page loads.
const OVERLAY = () => {
  const install = () => {
    if (document.getElementById("__demo")) return;
    const style = document.createElement("style");
    style.textContent = `nextjs-portal{display:none!important}
      #__demo_cursor{position:fixed;left:-60px;top:-60px;width:26px;height:26px;border-radius:50%;
        background:rgba(33,187,237,.35);border:2px solid #0D51A1;pointer-events:none;z-index:2147483647;
        transform:translate(-50%,-50%);transition:transform .1s}
      #__demo_caption{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);max-width:min(1000px,92vw);
        display:flex;align-items:center;gap:14px;padding:14px 22px;border-radius:999px;background:rgba(11,31,58,.92);
        color:#fff;font:600 19px/1.3 Inter,Arial,sans-serif;box-shadow:0 10px 30px rgba(11,31,58,.35);
        pointer-events:none;z-index:2147483646;transition:opacity .3s}
      #__demo_caption b{color:#21BBED;font-weight:800;white-space:nowrap}
      #__demo_caption:empty{opacity:0}
      #__demo_card{position:fixed;inset:0;z-index:2147483645;display:flex;flex-direction:column;justify-content:center;
        padding:0 9vw;background:#0B1F3A;color:#fff;font-family:Georgia,'Times New Roman',serif}
      #__demo_card img{width:110px;height:110px;border-radius:24px;background:#fff;padding:10px;margin-bottom:36px}
      #__demo_card h1{font-size:64px;line-height:1.05;margin:0 0 18px;max-width:900px}
      #__demo_card p{font:400 26px/1.4 Inter,Arial,sans-serif;color:#DCEBFA;margin:0;max-width:900px}`;
    const root = document.createElement("div");
    root.id = "__demo";
    root.innerHTML = '<div id="__demo_cursor"></div><div id="__demo_caption"></div>';
    document.documentElement.append(style, root);
    const cursor = document.getElementById("__demo_cursor");
    addEventListener(
      "mousemove",
      (e) => {
        cursor.style.left = e.clientX + "px";
        cursor.style.top = e.clientY + "px";
      },
      true,
    );
    addEventListener(
      "mousedown",
      () => (cursor.style.transform = "translate(-50%,-50%) scale(.6)"),
      true,
    );
    addEventListener(
      "mouseup",
      () => (cursor.style.transform = "translate(-50%,-50%) scale(1)"),
      true,
    );
    window.__demoCaption = (html) => {
      sessionStorage.setItem("__demo_caption", html);
      document.getElementById("__demo_caption").innerHTML = html;
    };
    window.__demoCaption(sessionStorage.getItem("__demo_caption") ?? "");
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
};

// ---- Wording -----------------------------------------------------------------------------------------------
const T = fr
  ? {
      cardTitle: "Le réseau des anciens de Maïmonide",
      cardSub: "Démonstration : le parcours d’un ancien, puis celui de l’école.",
      endTitle: "Merci!",
      endSub: "Critiques, suggestions, recommandations : tout est bienvenu.",
      s1: "Un ancien crée son compte",
      s2: "Il confirme son adresse courriel",
      s3: "Il se présente à l’école",
      s4: "En attendant, l’annuaire reste verrouillé",
      s5: "Un réviseur de l’école examine la demande",
      s6: "Approuvé : l’ancien crée son profil",
      s7: "« Comment aimeriez-vous aider? »",
      s8: "Il choisit d’apparaître dans l’annuaire",
      s9: "Il cherche un mentor en médecine",
      s10: "Il affiche le courriel : l’affichage est consigné",
      s11: "L’école voit le nouveau membre",
      s12: "Chaque décision reste au journal d’audit",
      create: "Créer mon compte",
      submit: "Envoyer ma demande",
      start: "Commencer",
      next: "Enregistrer et continuer",
      publish: "Publier mon profil",
      approve: "Approuver",
      review: "Examiner",
      history: "Historique",
      search: "Rechercher",
      showEmail: "Afficher le courriel",
      medicine: /Médecine/,
      mentoring: /^Mentorat/,
      advice: /^Conseils de carrière/,
      shadowing: /^Offre de l’observation|^Offre de l'observation/,
      note: "J’étais dans la classe de Mme Azoulay en secondaire 5.",
      bio: "Promotion {y} de Maïmonide. Heureuse d’aider les finissants qui pensent au droit.",
      title: "Avocate",
      employer: "Fasken",
      city: "Montréal",
      school: "Université de Montréal",
    }
  : {
      cardTitle: "The Maïmonide alumni network",
      cardSub: "Demo: a graduate’s journey, then the school’s.",
      endTitle: "Thank you!",
      endSub: "Criticism, suggestions, recommendations: all welcome.",
      s1: "A graduate creates an account",
      s2: "They confirm their email address",
      s3: "They introduce themselves to the school",
      s4: "Meanwhile, the directory stays locked",
      s5: "A school reviewer checks the request",
      s6: "Approved: the graduate builds a profile",
      s7: "“How would you like to help?”",
      s8: "They choose to appear in the directory",
      s9: "They look for a mentor in medicine",
      s10: "They reveal an email: each reveal is logged",
      s11: "The school sees the new member",
      s12: "Every decision stays in the audit log",
      create: "Create my account",
      submit: "Submit for school review",
      start: "Get started",
      next: "Save and continue",
      publish: "Publish my profile",
      approve: "Approve",
      review: "Review",
      history: "History",
      search: "Search",
      showEmail: "Show email",
      medicine: /Medicine/,
      mentoring: /^Mentoring/,
      advice: /^Career advice/,
      shadowing: /^Job shadowing|^Offers job shadowing|shadow/i,
      note: "I was in Mrs. Azoulay’s homeroom in my final year.",
      bio: "Maïmonide class of {y}. Happy to help graduates thinking about law.",
      title: "Lawyer",
      employer: "Fasken",
      city: "Montreal",
      school: "Université de Montréal",
    };
const PEOPLE = [
  ["Sarah", "Amsellem", "Cohen", 2012],
  ["Laura", "Benhamou", null, 2014],
  ["Myriam", "Toledano", "Elbaz", 2010],
  ["Orly", "Sebag", null, 2016],
  ["Judith", "Assouline", "Lévy", 2011],
  ["Noémie", "Ifergan", null, 2015],
];

// ---- Demo --------------------------------------------------------------------------------------------------
async function demo(s) {
  const record = has("record");
  const headless = has("headless");
  const manual = has("manual") && !headless;
  const fast = headless && !record; // a recording keeps a human pace
  const shots = opt("shots", null); // a folder: one screenshot per scene, to check a run
  if (shots) mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch({
    headless,
    slowMo: fast ? 0 : 40,
    args: record || headless ? [] : ["--start-maximized"],
  });
  const context = await newContext(browser, { headless, record });
  await context.addInitScript(OVERLAY);
  const page = await context.newPage();
  const pause = (ms) => page.waitForTimeout(ms);
  const caption = async (n, text) => {
    await page.evaluate((html) => window.__demoCaption?.(html), `<b>${n}</b><span>${text}</span>`);
    if (shots)
      await page.screenshot({ path: path.join(shots, `scene-${String(n).padStart(2, "0")}.png`) });
    if (manual) {
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            const h = (e) => {
              if (e.key === "ArrowRight") {
                removeEventListener("keydown", h, true);
                resolve();
              }
            };
            addEventListener("keydown", h, true);
          }),
      );
    } else await pause(1400);
  };
  const point = async (locator) => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
  };
  const click = async (locator) => {
    await point(locator);
    await pause(250);
    await locator.click();
  };
  const type = async (locator, text) => {
    await point(locator);
    await locator.click();
    await locator.pressSequentially(text, { delay: fast ? 0 : 45 });
  };
  const go = async (p) => {
    await page.goto(BASE + p, { waitUntil: "networkidle" });
    await pause(500);
  };
  const card = async (title, sub, ms, name = "title") => {
    await page.evaluate(
      ([t, s2]) => {
        const d = document.createElement("div");
        d.id = "__demo_card";
        d.innerHTML = `<img src="/institutes/logos/maimonide.png" alt=""><h1>${t}</h1><p>${s2}</p>`;
        document.documentElement.append(d);
      },
      [title, sub],
    );
    if (shots) await page.screenshot({ path: path.join(shots, `card-${name}.png`) });
    if (manual) await caption("→", "");
    else await pause(ms);
    await page.evaluate(() => document.getElementById("__demo_card")?.remove());
  };
  const btn = (name) => page.getByRole("button", { name, exact: true });

  const [first, last, maiden, year] = PEOPLE[Math.floor(Date.now() / 60_000) % PEOPLE.length];
  const email = `${first
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "")}.${Date.now().toString(36)}@maimonide.test`;
  let scene = "start";
  try {
    await go("/join");
    await card(T.cardTitle, T.cardSub, 3500);

    scene = "1 sign up";
    await caption("1", T.s1);
    await type(page.locator('input[name="email"]'), email);
    await type(page.locator('input[name="password"]'), PASSWORD);
    await type(page.locator('input[name="confirm_password"]'), PASSWORD);
    await click(btn(T.create));
    await page.getByRole("status").waitFor();
    await pause(1500);

    scene = "2 confirm email";
    await caption("2", T.s2);
    await page.goto(await confirmationLink(s, email), { waitUntil: "networkidle" });
    await page.locator('input[name="first_name"]').waitFor();
    const applicant = await sessionCookies(context);

    scene = "3 request access";
    await caption("3", T.s3);
    await type(page.locator('input[name="first_name"]'), first);
    await type(page.locator('input[name="last_name"]'), last);
    if (maiden) await type(page.locator('input[name="maiden_name"]'), maiden);
    await type(page.locator('input[name="grad_year"]'), String(year));
    const studentId = page.locator('input[name="school_student_id"]'); // ONB-09, once it ships
    if (await studentId.count()) await type(studentId, `${String(year).slice(2)}-0457`);
    await type(page.locator('textarea[name="note"]'), T.note);
    await click(btn(T.submit));
    await page.waitForURL(/\/account\/pending$/);

    scene = "4 pending";
    await caption("4", T.s4);
    await pause(2500);

    scene = "5 reviewer approves";
    await signInto(context, s, "reviewer@maimonide.test");
    await go("/admin");
    await caption("5", T.s5);
    await click(
      page.getByRole("link", { name: new RegExp(`^${fr ? "Approbations" : "Approvals"}`) }).first(),
    );
    await page.waitForLoadState("networkidle");
    await click(
      page.locator("tr", { hasText: `${first} ${last}` }).getByRole("link", { name: T.review }),
    );
    await page.waitForLoadState("networkidle");
    await pause(1800);
    await click(btn(T.approve));
    await page.waitForURL(/tab=decided/);
    await pause(1200);

    scene = "6 onboarding";
    await restore(context, applicant);
    await go("/auth/home");
    await page.waitForURL(/\/onboarding\/welcome$/);
    await caption("6", T.s6);
    await click(page.locator(`input[name="locale"][value="${LANG}"]`));
    await click(btn(T.start));
    await page.waitForURL(/\/about$/);
    await type(page.locator('input[name="city"]'), T.city);
    await type(page.locator('textarea[name="bio"]'), T.bio.replace("{y}", year));
    await click(btn(T.next));
    await page.waitForURL(/\/education$/);
    await type(page.locator('input[name="school"]').first(), T.school);
    await click(btn(T.next));
    await page.waitForURL(/\/career$/);
    const field = page.locator('select[name="career_field_id"]');
    const value = await field
      .locator("option", { hasText: fr ? "Droit" : "Law" })
      .first()
      .getAttribute("value");
    await point(field);
    await field.selectOption(value);
    await type(page.locator('input[name="job_title"]'), T.title);
    await type(page.locator('input[name="employer"]'), T.employer);
    await click(btn(T.next));
    await page.waitForURL(/\/networking$/);
    await caption("7", T.s7);
    for (const offer of [T.mentoring, T.advice])
      await click(page.getByRole("checkbox", { name: offer }));
    await pause(800);
    await click(btn(T.next));
    await page.waitForURL(/\/contact$/);
    await type(
      page.locator('input[name="linkedin"]'),
      `linkedin.com/in/${first.toLowerCase()}-${last.toLowerCase()}`,
    );
    await click(page.locator('input[name="linkedin_public"]'));
    await click(btn(T.next));
    await page.waitForURL(/\/publish$/);
    await caption("8", T.s8);
    await click(page.locator('input[name="visibility"][value="members"]'));
    await click(page.locator('input[name="consent"]'));
    await pause(800);
    await click(btn(T.publish));
    await page.waitForURL(/\/me$/);
    await pause(2000);

    scene = "9 find a mentor";
    await go("/home");
    await caption("9", T.s9);
    await click(
      page.getByRole("link", { name: fr ? "Mentorat" : "Mentoring", exact: true }).first(),
    );
    await page.waitForLoadState("networkidle");
    await pause(1200);
    await type(page.locator('input[name="q"]').first(), "Cardiologue");
    await click(page.getByRole("button", { name: T.search, exact: true }).first());
    await page.waitForLoadState("networkidle");
    await pause(800);
    await click(page.getByRole("link", { name: /Élie Azoulay/ }).first());
    await page.waitForURL(/\/profile\//);
    await pause(1500);

    scene = "10 reveal email";
    await caption("10", T.s10);
    await click(page.getByRole("button", { name: T.showEmail }));
    await pause(2500);

    scene = "11 school view";
    await signInto(context, s, "admin@maimonide.test");
    await go("/admin");
    await caption("11", T.s11);
    await pause(1500);
    await go(`/admin/alumni?q=${encodeURIComponent(last)}`);
    await click(page.getByRole("link", { name: new RegExp(`${first} ${last}`) }).first());
    await page.waitForLoadState("networkidle");
    await pause(1200);
    await click(
      page
        .getByRole("tab", { name: T.history })
        .or(page.getByRole("link", { name: T.history }))
        .first(),
    );
    await pause(2000);

    scene = "12 audit log";
    await go("/admin/audit");
    await caption("12", T.s12);
    await pause(1500);
    await click(page.locator('a.tag[href*="type=approvals"]'));
    await page.waitForURL(/type=approvals/);
    await pause(3000);

    await page.evaluate(() => window.__demoCaption?.(""));
    await card(T.endTitle, T.endSub, 4000, "end");
    console.log(green(`\nDemo finished. The applicant was ${first} ${last} (${email}).\n`));
  } catch (e) {
    console.log(red(`\nThe demo stopped at scene "${scene}": ${e.message.split("\n")[0]}`));
    console.log("The browser stays open so you can carry on by hand.\n");
    if (!headless && !record) await new Promise(() => {});
    process.exitCode = 1;
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();
    if (record && video) {
      const target = path.join(
        HERE,
        "videos",
        `demo-${LANG}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.webm`,
      );
      renameSync(await video.path(), target);
      console.log(`Video: ${target}`);
    }
  }
}

// ---- Main --------------------------------------------------------------------------------------------------
const s = stack();
if (has("setup") && s) {
  const admin = createClient(s.url, s.secret, { auth: { persistSession: false } });
  const { data } = await admin.from("institutions").select("id").eq("slug", "maimonide");
  if (!data?.length) setup();
  else console.log("The Maïmonide demo data is already loaded.");
}
const ok = has("skip-check") ? true : await preflight(s);
if (has("check")) process.exit(ok ? 0 : 1);
if (!ok) {
  console.log("Fix the failed checks first, or run with --skip-check.");
  process.exit(1);
}
if (has("record")) mkdirSync(path.join(HERE, "videos"), { recursive: true });
await demo(s);
