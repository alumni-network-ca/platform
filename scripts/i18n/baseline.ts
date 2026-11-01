import type { Finding } from "./analyze.ts";

export type BaselineEntry = Pick<Finding, "file" | "rule" | "text"> & { count: number };

const key = (entry: Pick<Finding, "file" | "rule" | "text">) =>
  JSON.stringify([entry.file, entry.rule, entry.text]);

/** Counts prevent an existing exception from covering newly copied occurrences. */
export function summarize(findings: Finding[]): BaselineEntry[] {
  const entries = new Map<string, BaselineEntry>();
  for (const finding of findings) {
    const id = key(finding);
    const existing = entries.get(id);
    if (existing) existing.count++;
    else entries.set(id, { file: finding.file, rule: finding.rule, text: finding.text, count: 1 });
  }
  return [...entries.values()].sort((a, b) => key(a).localeCompare(key(b), "en"));
}

export function checkBaseline(findings: Finding[], baseline: BaselineEntry[]) {
  const remaining = new Map(baseline.map((entry) => [key(entry), entry.count]));
  const added: Finding[] = [];
  for (const finding of findings) {
    const id = key(finding),
      count = remaining.get(id) ?? 0;
    // Dictionary errors must always fail, even if someone adds one to the baseline.
    if (finding.rule !== "ui-literal" || count === 0) added.push(finding);
    else remaining.set(id, count - 1);
  }
  const stale = baseline.filter((entry) => (remaining.get(key(entry)) ?? 0) > 0);
  return { added, stale };
}
