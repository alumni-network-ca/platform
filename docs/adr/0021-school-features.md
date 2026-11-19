# 0021: School features switched on per school by platform admins

- **Status:** Accepted · **Date:** 2026-11-18 · **Related:** SA-07, PRF-08, [0005](0005-authorization-model.md), [0018](0018-school-config-cache.md)

## Context

Some schools need a part of the product that others must not see. The first case is Hebrew Academy (Montreal): its
alumni usually spend a year or more at a yeshiva or seminary after graduating, and the school wants that on profiles
and in the directory. Herzliah and Maïmonide should see nothing of it. Until now every school had the same product;
only branding, reference options (career fields, networking options) and the email sender differed.

## Decision

- **`institutions.features` holds the switches** as a JSON object, `{"yeshiva_seminary": true}`. A missing key is off.
- **Only platform admins change it**, through `platform_set_school_features(inst, features)`, which checks
  `is_system_admin()`, keeps the known keys with boolean values, drops anything else, and writes a
  `school.features_updated` audit row. It is a product decision taken with the school (and possibly priced), not a
  school setting, so `update_school_settings` never reads it and school admins cannot change it (ADR 0005 already
  gives system admins "create and configure schools").
- **The console's school page has a Features panel** listing every feature from `FEATURES` in
  `src/lib/tenant/features.ts`. Adding a feature means adding its key there and in the RPC's list.
- **The app reads features from the cached school config** (`school_config()`, ADR 0018); the console action calls
  `refreshSchoolConfig` so the school's pages change on their next request. `hasFeature(config, key)` treats a config
  cached before this change as "all off".
- **The database enforces each feature, not only the UI.** For Yeshiva / Seminary: rows live in `alumni_yeshiva`, read
  under the education rules plus "the school has the feature" (`feature_institutions()`, a per-statement set as in
  20261028000200); `save_my_profile` refuses them at a school without it; the directory searches and filters them
  under the caller's RLS.
- **Switching a feature off hides its data and keeps it.** Switching it back on shows it again. The alumnus's data
  export always includes it.

## Consequences

- A new per-school feature is a key, a console entry and its own enforcement in SQL, with no new settings table.
- Features are on/off only. A feature that needs options of its own (a label, a list) would add them as its own
  columns or reference rows, like career fields.
- No design-canvas screen exists for the console panel or the yeshiva section; they follow the existing console
  panels, role rows and profile sections.
