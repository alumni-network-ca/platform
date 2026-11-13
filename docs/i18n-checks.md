# Translation checks

Every user-facing string should have English and French copy. CI runs `npm run i18n:check`, also included in `npm run check`, without a server, database, or credentials.

The check parses application sources under `src/app/`, `src/components/`, and `src/lib/` using the installed TypeScript compiler. Tests and declaration files are excluded. It checks:

- Literal JSX text, rendered string expressions, templates, conditional branches, concatenation, and fallbacks.
- Text props: `alt`, `title`, `placeholder`, accessible labels/descriptions, `label`, `description`, `heading`, `message`, `text`, `children`, `confirm`, `helpText`, `emptyMessage`, and `submitLabel`. Submit/reset/button input values are checked too.
- Native alert/confirm/prompt messages and literal `setError`/`setMessage` calls.
- Same-file constants and object properties that feed those expressions.
- Matching nested EN/FR dictionary keys, nonempty strings, and matching `{placeholders}` and dynamic substitutions in templates or concatenations. This includes the shared dictionary, component-local dictionaries such as `TEXT`, string-returning translation functions, and inline `locale === "fr"` choices (including boolean aliases). Dictionary keys must be explicit; spreads cannot hide missing translations.

Translation dictionaries are inspected as source, never executed. Use `useLanguage()` in client components or `getServerTranslations()` on the server, and pass the translated strings through props. Existing local EN/FR dictionaries are also supported. Keep template substitution expressions consistent across languages; translated word order can differ.

## Existing gaps

The initial audit found existing hardcoded copy. `scripts/i18n/baseline.json` records those findings by file, rule, normalized text, and occurrence count. CI permits these existing findings while failing on new, changed, duplicated, or moved literal declarations. It always fails on dictionary errors. Resolved baseline entries must be removed or reduced so they cannot conceal future regressions. Moving line numbers alone does not invalidate an entry.

Run `npm run i18n:audit` for strict mode, which fails until **every detected finding** is resolved. Both commands write `i18n-report.json` with file/line/column locations, including all baseline findings. CI uploads this report as the `translation-audit` artifact. The generated report is ignored by Git.

To resolve a finding, move the copy into matching EN/FR dictionary keys and use the localized value. Then remove/reduce its baseline entry. To regenerate the baseline after fixing copy:

```sh
npm run i18n:check -- --write-baseline
```

Review that diff: it should remove resolved findings. Do not regenerate it simply to accept new untranslated copy. CI never regenerates it. Any intentional exception for a brand, URL, or language-independent label should be reviewed in the baseline with the surrounding code.

## Limits

A green check prevents the supported source patterns from regressing; it does not certify that every rendered string is translated. It cannot assess translation quality or distinguish a proper name from prose. It does not trace arbitrary function calls, imported constants, array-map data flow, runtime/server/database content, arbitrary prop names, JSX spread props, metadata, or CSS-generated text. New rendering patterns need checker coverage or explicit review. Database-managed option labels and email templates need their own validation. Review both languages when changing a screen, including errors and empty states.
