## What and why

<!-- One or two sentences. Link the issue. -->

Closes #

## How to test

<!-- Steps a reviewer can follow locally or on the preview deployment. -->

## Checklist

- [ ] Tests added or updated (unit / pgTAP / Playwright)
- [ ] Strings exist in both `en` and `fr`
- [ ] Authorization enforced server-side / in RLS, not just in the UI
- [ ] Migration included? If so, it is forward-only, has recovery notes below, and its pgTAP tests pass
- [ ] No secrets, tokens or personal data in code, URLs or logs
- [ ] Docs updated (README / runbooks / ADR / traceability)
- [ ] `/code-review` run; `/security-review` run if auth, RLS, exports or email links changed

## Migration and rollback notes

<!-- "None", or how to recover if this has to be reverted. -->

## Screenshots

<!-- UI changes: before and after, desktop and mobile, EN and FR where relevant. -->
