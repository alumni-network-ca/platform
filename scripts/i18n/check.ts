import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { analyze } from "./analyze.ts";
import { checkBaseline, summarize } from "./baseline.ts";
import type { BaselineEntry } from "./baseline.ts";

const root = process.cwd();
const baselinePath = path.join(root, "scripts/i18n/baseline.json");
const args = new Set(process.argv.slice(2));
for (const arg of args) {
  if (!["--strict", "--write-baseline"].includes(arg)) throw new Error(`Unknown option: ${arg}`);
}
if (args.has("--strict") && args.has("--write-baseline")) {
  throw new Error("Use --strict or --write-baseline separately.");
}

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const file = `${directory}/${entry.name}`;
        if (entry.isDirectory()) return files(file);
        return /\.[cm]?[jt]sx?$/.test(file) && !/\.(test|spec|d)\.[cm]?[jt]sx?$/.test(file)
          ? [file]
          : [];
      }),
    )
  ).flat();
}

const names = (await Promise.all(["app", "components", "lib"].map(files))).flat().sort();
const program = ts.createProgram(names, {
  jsx: ts.JsxEmit.Preserve,
  target: ts.ScriptTarget.ESNext,
  allowJs: true,
  noResolve: true,
  noLib: true,
});
const checker = program.getTypeChecker();
const findings = names.flatMap((file) => {
  const source = program.getSourceFile(file);
  if (!source) throw new Error(`Could not parse ${file}`);
  if (program.getSyntacticDiagnostics(source).length)
    throw new Error(`Syntax error in ${file}; run npm run typecheck`);
  return analyze(source, checker);
});

// Always publish the full audit, including existing debt, for local review and CI artifacts.
await writeFile(
  path.join(root, "i18n-report.json"),
  JSON.stringify(
    {
      filesScanned: names.length,
      totalFindings: findings.length,
      findings,
    },
    null,
    2,
  ) + "\n",
);

if (args.has("--write-baseline")) {
  if (findings.some((finding) => finding.rule !== "ui-literal")) {
    throw new Error("Fix dictionary errors before writing a baseline. See i18n-report.json.");
  }
  await writeFile(baselinePath, JSON.stringify(summarize(findings), null, 2) + "\n");
  console.log(
    `Recorded ${findings.length} existing UI literals. Review baseline.json before committing.`,
  );
} else {
  const baseline: unknown = JSON.parse(await readFile(baselinePath, "utf8"));
  if (
    !Array.isArray(baseline) ||
    baseline.some(
      (entry) =>
        !entry ||
        typeof entry.file !== "string" ||
        entry.rule !== "ui-literal" ||
        typeof entry.text !== "string" ||
        !Number.isSafeInteger(entry.count) ||
        entry.count < 1,
    )
  ) {
    throw new Error(
      "Invalid i18n baseline; expected file, ui-literal rule, text and positive count.",
    );
  }
  if (
    new Set(baseline.map((entry) => JSON.stringify([entry.file, entry.rule, entry.text]))).size !==
    baseline.length
  ) {
    throw new Error("Duplicate i18n baseline entries.");
  }
  const { added, stale } = checkBaseline(findings, baseline as BaselineEntry[]);
  const failures = args.has("--strict") ? findings : added;
  for (const finding of failures) {
    console.error(
      `${finding.file}:${finding.line}:${finding.column} [${finding.rule}] ${finding.text}`,
    );
  }
  for (const entry of stale) {
    console.error(
      `Remove or reduce the resolved baseline entry: ${entry.file} ${JSON.stringify(entry.text)}`,
    );
  }
  console.log(
    `Translation check: ${names.length} files; ${findings.length} total findings; ${added.length} new; ${stale.length} resolved baseline entries. Full audit: i18n-report.json`,
  );
  if (failures.length || stale.length) process.exitCode = 1;
}
