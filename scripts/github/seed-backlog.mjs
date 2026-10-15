#!/usr/bin/env node
// Syncs .github/project (labels, milestones, issues, sub-issues and the Project board) to GitHub.
//
// Idempotent: each issue body carries a hidden marker with its backlog key and a hash of its YAML entry.
// Unchanged entries are skipped, so ticked checkboxes and comments on GitHub survive re-runs.
// Board fields are only filled when empty (Status also moves to Done when an issue is closed),
// so manual changes on the board are kept unless --force-fields is passed.
//
// Usage: node scripts/github/seed-backlog.mjs [--dry-run] [--skip-project] [--force-fields] [--preview=KEY]
// Auth:  GITHUB_TOKEN, or the token from `gh auth token` (needs repo, project and read:org scopes).

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const SKIP_PROJECT = args.has("--skip-project");
const FORCE_FIELDS = args.has("--force-fields");

const ROOT = path.resolve(import.meta.dirname, "../..");
const PROJECT_DIR = path.join(ROOT, ".github/project");
const MUTATION_GAP_MS = 1000; // stays under GitHub's 80 content-creating requests per minute
const GRAPHQL_BATCH = 10;
const GRAPHQL_GAP_MS = 1500; // 10 mutations x 5 points every 1.5 s stays under 2,000 points per minute

const stats = {
  created: 0,
  updated: 0,
  closed: 0,
  linked: 0,
  labels: 0,
  milestones: 0,
  projectItems: 0,
  fieldValues: 0,
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...m) => console.log(DRY_RUN ? "[dry-run]" : "", ...m);

// ---------------------------------------------------------------- load and validate the backlog

const config = parse(readFileSync(path.join(PROJECT_DIR, "config.yml"), "utf8"));
const [OWNER, REPO] = config.repo.split("/");
const REPO_URL = `https://github.com/${config.repo}`;
const adrFiles = readdirSync(path.join(ROOT, "docs/adr"));

const items = [];
for (const file of readdirSync(path.join(PROJECT_DIR, "backlog"))
  .filter((f) => f.endsWith(".yml"))
  .sort()) {
  const doc = parse(readFileSync(path.join(PROJECT_DIR, "backlog", file), "utf8"));
  const defaults = doc.defaults ?? {};
  for (const raw of doc.items) {
    items.push({
      ...defaults,
      ...raw,
      labels: [...new Set([...(defaults.labels ?? []), ...(raw.labels ?? [])])],
      state: raw.state ?? defaults.state ?? "open",
      file,
    });
  }
}

const itemsByKey = new Map();
const milestoneByKey = new Map(config.milestones.map((m) => [m.key, m]));
const labelNames = new Set(config.labels.map((l) => l.name));
const problems = [];
for (const it of items) {
  if (itemsByKey.has(it.key)) problems.push(`duplicate key ${it.key}`);
  itemsByKey.set(it.key, it);
}
for (const it of items) {
  if (!milestoneByKey.has(it.milestone))
    problems.push(`${it.key}: unknown milestone ${it.milestone}`);
  for (const l of it.labels) if (!labelNames.has(l)) problems.push(`${it.key}: unknown label ${l}`);
  if (it.epic && !itemsByKey.get(it.epic)?.labels.includes("type:epic"))
    problems.push(`${it.key}: epic ${it.epic} is not an epic`);
  for (const k of [...(it.depends ?? []), ...(it.related ?? [])])
    if (!itemsByKey.has(k)) problems.push(`${it.key}: unknown reference ${k}`);
  if (it.adr && !adrFiles.some((f) => f.startsWith(it.adr)))
    problems.push(`${it.key}: unknown ADR ${it.adr}`);
  if (!it.labels.includes("type:epic") && !it.epic) problems.push(`${it.key}: missing epic`);
}
if (problems.length) {
  console.error("Backlog validation failed:\n- " + problems.join("\n- "));
  process.exit(1);
}
log(`Loaded ${items.length} backlog items from ${PROJECT_DIR}`);

// ---------------------------------------------------------------- GitHub API

const TOKEN =
  process.env.GITHUB_TOKEN ?? execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();

async function api(method, url, body) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url.startsWith("http") ? url : `https://api.github.com${url}`, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const rateLimited =
      (res.status === 403 || res.status === 429) &&
      (/rate limit/i.test(text) || res.headers.get("retry-after"));
    if (rateLimited && attempt < 6) {
      const reset = Number(res.headers.get("x-ratelimit-reset"));
      const wait =
        Number(res.headers.get("retry-after")) ||
        (res.headers.get("x-ratelimit-remaining") === "0" && reset
          ? Math.max(1, reset - Date.now() / 1000)
          : 60);
      console.warn(`  rate limited on ${method} ${url}; waiting ${Math.ceil(wait)}s`);
      await sleep(wait * 1000);
      continue;
    }
    if (res.status >= 500 && attempt < 3) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text}`);
    return text ? JSON.parse(text) : null;
  }
}

async function mutate(method, url, body) {
  if (DRY_RUN) return null;
  const result = await api(method, url, body);
  await sleep(MUTATION_GAP_MS);
  return result;
}

async function paginate(url) {
  const out = [];
  for (let page = 1; ; page++) {
    const sep = url.includes("?") ? "&" : "?";
    const batch = await api("GET", `${url}${sep}per_page=100&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) return out;
  }
}

async function graphql(query, variables = {}) {
  const res = await api("POST", "/graphql", { query, variables });
  if (res.errors?.length)
    throw new Error(`GraphQL: ${res.errors.map((e) => e.message).join("; ")}`);
  return res.data;
}

// ---------------------------------------------------------------- labels and milestones

async function syncLabels() {
  const existing = new Map(
    (await paginate(`/repos/${OWNER}/${REPO}/labels`)).map((l) => [l.name, l]),
  );
  for (const name of config.deleteLabels ?? []) {
    if (existing.has(name)) {
      log(`delete label ${name}`);
      await mutate("DELETE", `/repos/${OWNER}/${REPO}/labels/${encodeURIComponent(name)}`);
    }
  }
  for (const l of config.labels) {
    const e = existing.get(l.name);
    if (!e) {
      log(`create label ${l.name}`);
      await mutate("POST", `/repos/${OWNER}/${REPO}/labels`, l);
      stats.labels++;
    } else if (
      e.color.toLowerCase() !== l.color.toLowerCase() ||
      (e.description ?? "") !== (l.description ?? "")
    ) {
      log(`update label ${l.name}`);
      await mutate("PATCH", `/repos/${OWNER}/${REPO}/labels/${encodeURIComponent(l.name)}`, {
        color: l.color,
        description: l.description,
      });
      stats.labels++;
    }
  }
}

const milestoneNumbers = new Map();

const milestoneStates = new Map();

// Milestones are created open so issues can be assigned to them; closeMilestones() closes them at the end.
async function syncMilestones() {
  const existing = new Map(
    (await paginate(`/repos/${OWNER}/${REPO}/milestones?state=all`)).map((m) => [m.title, m]),
  );
  for (const m of config.milestones) {
    const want = { title: m.title, description: m.description };
    if (m.due) want.due_on = `${m.due}T12:00:00Z`;
    const e = existing.get(m.title);
    if (!e) {
      log(`create milestone ${m.title}`);
      const created = await mutate("POST", `/repos/${OWNER}/${REPO}/milestones`, want);
      milestoneNumbers.set(m.key, created?.number ?? -1);
      milestoneStates.set(m.key, "open");
      stats.milestones++;
      continue;
    }
    milestoneNumbers.set(m.key, e.number);
    milestoneStates.set(m.key, e.state);
    // GitHub stores due dates in Pacific time, so allow a one-day drift before treating them as different.
    const dueDrift =
      m.due && e.due_on
        ? Math.abs(Date.parse(e.due_on) - Date.parse(want.due_on)) > 36 * 3600e3
        : !!m.due !== !!e.due_on;
    if (e.description !== want.description || dueDrift) {
      log(`update milestone ${m.title}`);
      await mutate("PATCH", `/repos/${OWNER}/${REPO}/milestones/${e.number}`, want);
      stats.milestones++;
    }
  }
}

async function closeMilestones() {
  for (const m of config.milestones) {
    if (m.state !== "closed" || milestoneStates.get(m.key) === "closed") continue;
    log(`close milestone ${m.title}`);
    await mutate("PATCH", `/repos/${OWNER}/${REPO}/milestones/${milestoneNumbers.get(m.key)}`, {
      state: "closed",
    });
  }
}

// ---------------------------------------------------------------- issues

const MARKER = /<!-- backlog key=(\S+) hash=(\S+) resolved=(\d) -->/;
const issuesByKey = new Map(); // key -> { number, id, node_id, state, labels, assignees }
const markers = new Map(); // key -> { hash, resolved }
const assignable = new Map();

const hashOf = (it) =>
  createHash("sha256")
    .update(JSON.stringify({ ...it, file: undefined }))
    .digest("hex")
    .slice(0, 12);
const titleOf = (it) => (it.labels.includes("type:epic") ? it.title : `${it.key} · ${it.title}`);
const priorityOf = (it) => it.labels.find((l) => /^P\d$/.test(l));

async function isAssignable(login) {
  if (!assignable.has(login)) {
    try {
      await api("GET", `/repos/${OWNER}/${REPO}/assignees/${login}`);
      assignable.set(login, true);
    } catch {
      assignable.set(login, false);
      console.warn(
        `  ${login} is not assignable yet (pending invitation?); re-run the seeder once they accept`,
      );
    }
  }
  return assignable.get(login);
}

// Summaries are YAML literal blocks wrapped for readability. Rejoin wrapped lines: indented lines continue
// the list item above, column-0 lines continue the paragraph above or start a new paragraph after a list.
function reflow(text) {
  const out = [];
  let inList = false;
  for (const line of text
    .trim()
    .split("\n")
    .map((l) => l.trimEnd())) {
    if (!line) {
      out.push("");
      inList = false;
    } else if (/^\s*([-*]|\d+\.)\s/.test(line)) {
      out.push(line);
      inList = true;
    } else if (out.length && out.at(-1) !== "" && (inList ? /^\s/.test(line) : true)) {
      out[out.length - 1] += ` ${line.trim()}`;
    } else {
      if (inList) out.push("");
      out.push(line.trim());
      inList = false;
    }
  }
  return out.join("\n");
}

function renderBody(it) {
  const refs = [...(it.depends ?? []), ...(it.related ?? [])];
  const resolved = refs.every((k) => issuesByKey.get(k)?.number > 0);
  const ref = (k) => {
    const n = issuesByKey.get(k)?.number;
    return `${n > 0 ? `#${n}` : ""} \`${k}\` ${itemsByKey.get(k).title}`.trim();
  };
  const adrFile = it.adr && adrFiles.find((f) => f.startsWith(it.adr));
  const meta = [
    `**\`${it.key}\`**`,
    `Track **${it.track}**`,
    it.size && `Size **${it.size}**`,
    priorityOf(it) && `Priority **${priorityOf(it)}**`,
    it.class && `Classification **${it.class}**`,
  ].filter(Boolean);
  const meta2 = [
    it.reqs?.length && `**Requirements:** ${it.reqs.join(", ")}`,
    adrFile &&
      `**ADR:** [${adrFile.replace(/\.md$/, "")}](${REPO_URL}/blob/dev/docs/adr/${adrFile})`,
  ].filter(Boolean);

  const parts = [
    `<!-- backlog key=${it.key} hash=${hashOf(it)} resolved=${resolved ? 1 : 0} -->`,
    meta.join(" · "),
  ];
  if (meta2.length) parts.push(meta2.join(" · "));
  parts.push(`### Summary\n${reflow(it.summary)}`);
  if (it.findings?.length)
    parts.push(
      `### Findings\n${it.findings.join(", ")}. See [PRODUCT_ANALYSIS.md §4](${REPO_URL}/blob/dev/docs/PRODUCT_ANALYSIS.md).`,
    );
  if (it.ac?.length)
    parts.push(
      `### Acceptance criteria\n${it.ac.map((a) => `- [${it.state === "closed" ? "x" : " "}] ${a}`).join("\n")}`,
    );
  if (it.tests?.length)
    parts.push(`### Tests / evidence\n${it.tests.map((t) => `- ${t}`).join("\n")}`);
  if (it.depends?.length)
    parts.push(`### Depends on\n${it.depends.map((k) => `- ${ref(k)}`).join("\n")}`);
  if (it.related?.length)
    parts.push(
      `### ${it.class ? "Follow-up / replaced by" : "Related"}\n${it.related.map((k) => `- ${ref(k)}`).join("\n")}`,
    );
  if (it.track === "Tech" && !it.labels.includes("type:epic") && it.state !== "closed")
    parts.push(
      `Definition of Done: see [CONTRIBUTING.md](${REPO_URL}/blob/dev/CONTRIBUTING.md#definition-of-done).`,
    );
  parts.push(
    `<sub>Managed from \`.github/project/backlog/${it.file}\` by \`scripts/github/seed-backlog.mjs\`. ` +
      `Change scope in the YAML; ticking boxes and commenting here is fine.</sub>`,
  );
  return { body: parts.join("\n\n"), resolved };
}

async function loadIssues() {
  for (const is of await paginate(`/repos/${OWNER}/${REPO}/issues?state=all`)) {
    if (is.pull_request) continue;
    const m = is.body?.match(MARKER);
    if (!m) continue;
    issuesByKey.set(m[1], {
      number: is.number,
      id: is.id,
      node_id: is.node_id,
      state: is.state,
      labels: is.labels.map((l) => l.name),
      assignees: is.assignees.map((a) => a.login),
    });
    markers.set(m[1], { hash: m[2], resolved: m[3] === "1" });
  }
}

async function createMissingIssues() {
  let fakeNumber = 0;
  for (const it of items) {
    if (issuesByKey.has(it.key)) continue;
    const { body, resolved } = renderBody(it);
    const payload = {
      title: titleOf(it),
      body,
      labels: it.labels,
      milestone: milestoneNumbers.get(it.milestone),
    };
    if (it.assignee && (await isAssignable(it.assignee))) payload.assignees = [it.assignee];
    log(`create issue ${it.key}`);
    const created = await mutate("POST", `/repos/${OWNER}/${REPO}/issues`, payload);
    const rec = created
      ? {
          number: created.number,
          id: created.id,
          node_id: created.node_id,
          state: "open",
          labels: it.labels,
          assignees: payload.assignees ?? [],
        }
      : { number: -++fakeNumber, state: "open", labels: it.labels, assignees: [] };
    issuesByKey.set(it.key, rec);
    markers.set(it.key, { hash: hashOf(it), resolved });
    stats.created++;
  }
}

async function updateIssues() {
  for (const it of items) {
    const rec = issuesByKey.get(it.key);
    const marker = markers.get(it.key);
    const patch = {};
    const { body, resolved } = renderBody(it);
    if (marker.hash !== hashOf(it) || (!marker.resolved && resolved)) {
      Object.assign(patch, {
        title: titleOf(it),
        body,
        milestone: milestoneNumbers.get(it.milestone),
        labels: [...new Set([...rec.labels, ...it.labels])],
      });
    }
    if (it.assignee && !rec.assignees.length && (await isAssignable(it.assignee)))
      patch.assignees = [it.assignee];
    if (it.state === "closed" && rec.state !== "closed") {
      patch.state = "closed";
      patch.state_reason = it.state_reason ?? "completed";
      stats.closed++;
    }
    if (!Object.keys(patch).length) continue;
    log(`update issue ${it.key} (${Object.keys(patch).join(", ")})`);
    if (rec.number > 0)
      await mutate("PATCH", `/repos/${OWNER}/${REPO}/issues/${rec.number}`, patch);
    if (patch.state) rec.state = "closed";
    stats.updated++;
  }
}

async function linkSubIssues() {
  const childrenByEpic = new Map();
  for (const it of items)
    if (it.epic) childrenByEpic.set(it.epic, [...(childrenByEpic.get(it.epic) ?? []), it.key]);
  for (const [epicKey, childKeys] of childrenByEpic) {
    const epic = issuesByKey.get(epicKey);
    const existing =
      epic.number > 0
        ? new Set(
            (await paginate(`/repos/${OWNER}/${REPO}/issues/${epic.number}/sub_issues`)).map(
              (s) => s.id,
            ),
          )
        : new Set();
    for (const key of childKeys) {
      const child = issuesByKey.get(key);
      if (existing.has(child.id)) continue;
      log(`link ${key} under ${epicKey}`);
      await mutate("POST", `/repos/${OWNER}/${REPO}/issues/${epic.number}/sub_issues`, {
        sub_issue_id: child.id,
        replace_parent: true,
      });
      stats.linked++;
    }
  }
}

// ---------------------------------------------------------------- project board

const FIELD_FRAGMENT = `
  fields(first: 50) { nodes {
    ... on ProjectV2FieldCommon { id name dataType }
    ... on ProjectV2SingleSelectField { options { id name } }
  } }`;

async function ensureProject() {
  const { organization: org } = await graphql(
    `
      query ($login: String!) {
        organization(login: $login) {
          id
          projectsV2(first: 50) {
            nodes {
              id
              number
              title
              url
            }
          }
        }
      }
    `,
    { login: config.project.owner },
  );
  let project = org.projectsV2.nodes.find((p) => p.title === config.project.title);
  if (!project) {
    log(`create project "${config.project.title}"`);
    if (DRY_RUN) return null;
    project = (
      await graphql(
        `
          mutation ($owner: ID!, $title: String!) {
            createProjectV2(input: { ownerId: $owner, title: $title }) {
              projectV2 {
                id
                number
                title
                url
              }
            }
          }
        `,
        { owner: org.id, title: config.project.title },
      )
    ).createProjectV2.projectV2;
  }
  if (!DRY_RUN) {
    await graphql(
      `
        mutation ($id: ID!, $desc: String!, $readme: String!) {
          updateProjectV2(input: { projectId: $id, shortDescription: $desc, readme: $readme }) {
            projectV2 {
              id
            }
          }
        }
      `,
      { id: project.id, desc: config.project.shortDescription, readme: config.project.readme },
    );
    const repo = await api("GET", `/repos/${OWNER}/${REPO}`);
    const { node } = await graphql(
      `
        query ($id: ID!) {
          node(id: $id) {
            ... on ProjectV2 {
              repositories(first: 20) {
                nodes {
                  id
                }
              }
            }
          }
        }
      `,
      { id: project.id },
    );
    if (!node.repositories.nodes.some((r) => r.id === repo.node_id)) {
      log(`link project to ${config.repo}`);
      await graphql(
        `
          mutation ($p: ID!, $r: ID!) {
            linkProjectV2ToRepository(input: { projectId: $p, repositoryId: $r }) {
              repository {
                id
              }
            }
          }
        `,
        {
          p: project.id,
          r: repo.node_id,
        },
      );
    }
  }
  console.log(`Project: ${project.url}`);
  return project;
}

async function loadFields(projectId) {
  const { node } = await graphql(
    `query($id: ID!) { node(id: $id) { ... on ProjectV2 { ${FIELD_FRAGMENT} } } }`,
    { id: projectId },
  );
  return new Map(node.fields.nodes.filter((f) => f.name).map((f) => [f.name, f]));
}

async function ensureFields(projectId) {
  let fields = await loadFields(projectId);
  const selects = [config.fields.status, ...config.fields.singleSelect];
  for (const def of selects) {
    const options = def.options.map((o) => ({
      name: o.name,
      color: o.color,
      description: o.description ?? "",
    }));
    const field = fields.get(def.name);
    if (!field) {
      log(`create field ${def.name}`);
      if (!DRY_RUN)
        await graphql(
          `
            mutation ($p: ID!, $name: String!, $opts: [ProjectV2SingleSelectFieldOptionInput!]) {
              createProjectV2Field(
                input: {
                  projectId: $p
                  dataType: SINGLE_SELECT
                  name: $name
                  singleSelectOptions: $opts
                }
              ) {
                projectV2Field {
                  ... on ProjectV2FieldCommon {
                    id
                  }
                }
              }
            }
          `,
          { p: projectId, name: def.name, opts: options },
        );
    } else if (
      def.options.map((o) => o.name).join("|") !== field.options.map((o) => o.name).join("|")
    ) {
      log(`update options of field ${def.name}`);
      if (!DRY_RUN)
        try {
          await graphql(
            `
              mutation ($f: ID!, $opts: [ProjectV2SingleSelectFieldOptionInput!]) {
                updateProjectV2Field(input: { fieldId: $f, singleSelectOptions: $opts }) {
                  projectV2Field {
                    ... on ProjectV2FieldCommon {
                      id
                    }
                  }
                }
              }
            `,
            { f: field.id, opts: options },
          );
        } catch (e) {
          console.warn(`  could not update options of ${def.name}: ${e.message}`);
        }
    }
  }
  for (const [list, type] of [
    [config.fields.text, "TEXT"],
    [config.fields.date, "DATE"],
  ]) {
    for (const name of list) {
      if (fields.has(name)) continue;
      log(`create field ${name}`);
      if (!DRY_RUN)
        await graphql(
          `mutation($p: ID!, $name: String!) { createProjectV2Field(input: { projectId: $p, dataType: ${type}, name: $name }) { projectV2Field { ... on ProjectV2FieldCommon { id } } } }`,
          { p: projectId, name },
        );
    }
  }
  fields = await loadFields(projectId);
  return fields;
}

async function loadProjectItems(projectId) {
  const items = new Map(); // issue number -> { id, values: Map(fieldName -> value) }
  let after = null;
  do {
    const { node } = await graphql(
      `
        query ($id: ID!, $after: String) {
          node(id: $id) {
            ... on ProjectV2 {
              items(first: 100, after: $after) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  content {
                    ... on Issue {
                      number
                    }
                  }
                  fieldValues(first: 30) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldTextValue {
                        text
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldDateValue {
                        date
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
      { id: projectId, after },
    );
    for (const n of node.items.nodes) {
      if (!n.content?.number) continue;
      const values = new Map(
        n.fieldValues.nodes
          .filter((v) => v.field)
          .map((v) => [v.field.name, v.name ?? v.text ?? v.date]),
      );
      items.set(n.content.number, { id: n.id, values });
    }
    after = node.items.pageInfo.hasNextPage ? node.items.pageInfo.endCursor : null;
  } while (after);
  return items;
}

// Project mutations are idempotent, so a chunk that fails with a transient server error is retried, then sent one by one.
async function runBatched(mutations) {
  for (let i = 0; i < mutations.length; i += GRAPHQL_BATCH) {
    const chunk = mutations.slice(i, i + GRAPHQL_BATCH);
    const send = (list) => graphql(`mutation { ${list.map((m, j) => `m${j}: ${m}`).join("\n")} }`);
    try {
      await send(chunk);
    } catch (e) {
      console.warn(`  batch failed (${e.message.slice(0, 80)}); retrying one by one`);
      await sleep(10_000);
      for (const m of chunk) {
        for (let attempt = 1; ; attempt++) {
          try {
            await send([m]);
            break;
          } catch (err) {
            if (attempt === 3) {
              console.warn(
                `  giving up on one mutation (re-run the seeder to retry): ${err.message.slice(0, 80)}`,
              );
              break;
            }
            await sleep(5_000 * attempt);
          }
        }
        await sleep(GRAPHQL_GAP_MS / GRAPHQL_BATCH);
      }
    }
    await sleep(GRAPHQL_GAP_MS);
  }
}

// Used only if GitHub refuses to replace the default Status options (Todo / In Progress / Done).
const DEFAULT_STATUS_FALLBACK = {
  Backlog: "Todo",
  Ready: "Todo",
  Blocked: "Todo",
  "In progress": "In Progress",
  "In review": "In Progress",
};

// Closed in the YAML, or closed on GitHub (e.g. by merging a PR with "Closes #N").
const isClosed = (it) => it.state === "closed" || issuesByKey.get(it.key)?.state === "closed";

function desiredValues(it) {
  const m = milestoneByKey.get(it.milestone);
  const area = it.labels.find((l) => l.startsWith("area:"))?.slice(5);
  return {
    Status: isClosed(it) ? "Done" : (it.status ?? "Backlog"),
    Priority: priorityOf(it),
    Size: it.size,
    Track: it.track,
    Area: area,
    Requirements: it.reqs?.join(", "),
    Key: it.key,
    Start: m.start,
    Target: m.due,
  };
}

async function syncProject() {
  const project = await ensureProject();
  if (!project) return;
  const fields = await ensureFields(project.id);
  let projectItems = await loadProjectItems(project.id);

  const toAdd = items.filter((it) => !projectItems.has(issuesByKey.get(it.key).number));
  if (toAdd.length) {
    log(`add ${toAdd.length} issues to the project`);
    await runBatched(
      toAdd.map(
        (it) =>
          `addProjectV2ItemById(input: { projectId: "${project.id}", contentId: "${issuesByKey.get(it.key).node_id}" }) { item { id } }`,
      ),
    );
    stats.projectItems += toAdd.length;
    projectItems = await loadProjectItems(project.id);
  }

  const updates = [];
  for (const it of items) {
    const pi = projectItems.get(issuesByKey.get(it.key).number);
    if (!pi) continue;
    for (const [name, want] of Object.entries(desiredValues(it))) {
      if (want === undefined || want === null || want === "") continue;
      const field = fields.get(name);
      if (!field) continue;
      const current = pi.values.get(name);
      const closedNotDone = name === "Status" && isClosed(it) && current !== "Done";
      if (current === want || (current && !FORCE_FIELDS && !closedNotDone)) continue;
      let value;
      if (field.options) {
        const opt =
          field.options.find((o) => o.name === want) ??
          field.options.find(
            (o) => o.name.toLowerCase() === DEFAULT_STATUS_FALLBACK[want]?.toLowerCase(),
          );
        if (!opt) {
          console.warn(`  ${it.key}: no option "${want}" in field ${name}`);
          continue;
        }
        value = `{ singleSelectOptionId: "${opt.id}" }`;
      } else if (field.dataType === "DATE") value = `{ date: "${want}" }`;
      else value = `{ text: ${JSON.stringify(want)} }`;
      updates.push(
        `updateProjectV2ItemFieldValue(input: { projectId: "${project.id}", itemId: "${pi.id}", fieldId: "${field.id}", value: ${value} }) { projectV2Item { id } }`,
      );
    }
  }
  if (updates.length) {
    log(`set ${updates.length} field values`);
    if (!DRY_RUN) await runBatched(updates);
    stats.fieldValues += updates.length;
  }
}

// ---------------------------------------------------------------- main

const previewKey = process.argv.find((a) => a.startsWith("--preview="))?.slice("--preview=".length);
if (previewKey) {
  await loadIssues();
  console.log(
    `${titleOf(itemsByKey.get(previewKey))}\n\n${renderBody(itemsByKey.get(previewKey)).body}`,
  );
  process.exit(0);
}

await syncLabels();
await syncMilestones();
await loadIssues();
await createMissingIssues();
await updateIssues();
await linkSubIssues();
await closeMilestones();
if (!SKIP_PROJECT) await syncProject();

console.log(`\nDone${DRY_RUN ? " (dry run, nothing written)" : ""}:`, stats);
