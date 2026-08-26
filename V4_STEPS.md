# V4 rollout

1. Upload all V4 files to GitHub and commit.
2. In Supabase SQL Editor run `supabase/migrations/004_full_profile_package.sql`.
3. Wait for Vercel to redeploy.
4. Sign in and click Complete profile. The new five-step onboarding collects:
   - Herzliah graduating class and current location
   - Education history
   - Broad Career field + exact job title + current employer
   - Previous jobs
   - Networking/help preferences
   - Privacy/visibility
5. Admin -> All alumni now shows/searches the complete database.
6. Directory uses Career field, University, Location, Herzliah class, and Open-to filters. Industry is removed from the UI.
