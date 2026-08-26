# Herzliah Alumni Network — Real V1 Foundation

This is the first real Next.js + Supabase codebase based on the approved Herzliah preview.

## Connected public Supabase project
- Project URL: `https://pjqbzycokfomwaxbjlai.supabase.co`
- The local `.env.local` contains only the publishable key supplied by the project owner.
- No secret/service-role key is included or required for this foundation.

## Implemented in this build
- Herzliah-branded landing page
- Supabase magic-link authentication
- Multi-tenant schema (`institutions`, memberships, `institution_id` on tenant data)
- Postgres Row Level Security policies
- Alumni profile records
- Unclaimed records hidden from the directory
- Privacy preset + contact controls in schema
- Availability/mentorship flags
- Searchable alumni directory connected to Supabase
- Individual alumni profile pages connected to Supabase
- Privacy-safe claim-record lookup
- Institution Admin dashboard
- Admin CSV import of unclaimed alumni
- Super Admin / Institution Admin / Alumni / future Student role model
- Invitation and audit-log tables ready for the next phase

## First Supabase setup step
1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Create a new query.
4. Paste all of `supabase/migrations/001_initial_schema.sql`.
5. Click **Run**.

## Make your own login the Super Admin
After your user exists in **Authentication → Users**, copy its UUID and run:

```sql
insert into public.institution_memberships(institution_id,user_id,role)
select id,'YOUR_AUTH_USER_UUID'::uuid,'super_admin'
from public.institutions where slug='herzliah';
```

## Run locally
```bash
npm install
npm run dev
```
Then open `http://localhost:3000`.

## Deploy to Vercel
Import the project into GitHub, connect that repository to Vercel, and add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_DEFAULT_INSTITUTION_SLUG`

Never put a Supabase secret/service-role key into frontend environment variables.

## Next phase
Full claim-token redemption, edit-profile wizard, privacy UI, admin account suspension, invitation email delivery, and reconfirmation emails.
