# Auth and claim technical sequence

The current sequence relies on a same-browser PKCE verifier and ignores the exchange error. The target uses token-hash confirmation, session refresh, and invitation redemption.

```mermaid
sequenceDiagram
participant B as Browser
participant A as Supabase Auth
participant E as Email
participant N as Next route handler
participant DB as Postgres
B->>A: signUp with PKCE verifier stored locally
A->>E: Send code link
E->>B: Open link, possibly another device
B->>N: GET /auth/callback?code&next
N->>A: exchangeCodeForSession(code)
A-->>N: Error possible and ignored ⛔ F9
N-->>B: Redirect to unvalidated next ⛔ F7
B->>N: /onboarding getUser()
B->>DB: claim_my_profile()
DB->>DB: Match auth.jwt email ⛔ F8
DB->>DB: Update profile, membership, flags, audit
Note over B,N: No middleware session refresh ⚠ F11
```

### Target sequence

```mermaid
sequenceDiagram
participant B as Browser
participant M as middleware.ts
participant A as Supabase Auth
participant N as Next.js app
participant DB as Postgres
B->>M: Any request ▢ 0.3
M->>A: Refresh session ▢ 0.3
A-->>B: Email token_hash link
B->>N: GET /auth/confirm?token_hash&type=signup ▢ 0.5
N->>A: verifyOtp ▢ 0.5
N->>N: safeNext() ▢ 0.4
B->>DB: claim_with_invitation(token) ▢ 1.3
B->>DB: save_my_profile(payload) ▢ 1.5
```

## Notes

- **F7** — Open redirect.
- **F8** — The claim depends entirely on email confirmation.
- **F9** — Auth emails don't work for real alumni.
- **F11** — No `middleware.ts` session refresh.
- **0.3** — `middleware.ts` that refreshes the session on every request.
- **0.4** — `safeNext()` helper used by the callback and login.
- **0.5** — `/auth/confirm` (`verifyOtp` with `token_hash`) and an `/auth/error` page; keep `/auth/callback` for OAuth only.
- **1.3** — `claim_with_invitation(token)`: the tenant comes from the token. Keep tenant-aware email-match as a fallback.
- **1.5** — `save_my_profile(payload jsonb)`, one transaction, used by both onboarding and `/me`.
