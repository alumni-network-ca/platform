# 0013: Git workflow and releases

- **Status:** Accepted · **Date:** 2026-10-14 · **Requirements:** D1

## Decision

- **Where the code lives:** `alumni-network-ca/platform` (private). The history was imported from `castielnoah-art/herzliah-alumni-network`, which will be archived after cutover.
- **Branches:**
  - `dev` is the **default branch**, so PRs target it and `Closes #N` auto-closes issues. It deploys to staging.
  - `main` is production and only receives release PRs.
- **Merging:**
  - Feature PRs are squash-merged.
  - Release PRs (`dev` → `main`) use a merge commit, so the branches never diverge.
  - Noah approves each release after a staging demo.
- **Enforcement:** none for now. Branch protection on private repos needs GitHub Team ($4/user/month), so we rely on convention plus CI status checks, and can upgrade when the budget allows.
- **Details:** see [CONTRIBUTING.md](../../CONTRIBUTING.md).
