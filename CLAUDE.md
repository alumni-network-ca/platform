# CLAUDE.md

@AGENTS.md

## Project docs

- Overview, setup and commands: `README.md`. Branches, PRs and Definition of Done: `CONTRIBUTING.md`.
- Architecture decisions: `docs/adr/` and `docs/DECISIONS.md`. The database rules (ADR 0005, RLS, RPCs) are the authority on who may do what.

## Design source of truth

- UI work follows `docs/design/`. Before building or changing a screen, read the matching spec (e.g. `docs/design/nav-bar.md`) and the screen's file in `docs/design/alumni-full-flow/` (index: its `README.md`, which maps screens to routes and backlog keys).
- `docs/design/alumni-full-flow/` is a copy of the design canvas. The canvas files are mocks: copy layout, wording and flow, not their code; names and numbers in them are sample data.
- If the design and the code disagree, follow the design for look and wording, and say so in your summary. If the design and the database rules disagree on permissions, follow the database rules and flag it.
- Shared layout (the nav bar) is defined once on the canvas's Layout page; build it as one shared component, never per page.
