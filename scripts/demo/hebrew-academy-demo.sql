-- Hebrew Academy demo school on the LOCAL stack only, for the Hebrew Academy demo. Fictional people.
-- It has the Yeshiva / Seminary feature on (ADR 0021, PRF-08), so its alumni list where they studied after graduating.
-- Accounts use the local seed password (supabase/seed.sql). Load once per database (it stops if the school exists;
-- deleting it fails because the audit log is append-only):
--   docker exec -i supabase_db_alumni-network psql -U postgres -d postgres < scripts/demo/hebrew-academy-demo.sql
do $$ begin
  if exists (select 1 from public.institutions where slug = 'hebrew-academy') then
    raise exception 'hebrew-academy already loaded';
  end if;
end $$;

insert into public.institutions (id, name, slug, default_locale, reply_to_email, email_display_name, branding, features)
values ('aaaaaaaa-0000-4000-8000-00000000d002', 'Hebrew Academy', 'hebrew-academy', 'en', 'alumni@hebrew-academy.test',
  'Hebrew Academy Alumni Network',
  '{"short_name": "Hebrew Academy", "logo": "/institutes/logos/hebrew-academy.png",
    "favicon": "/institutes/favicons/hebrew-academy.png", "primary_color": "#004990", "accent_color": "#919295"}',
  '{"yeshiva_seminary": true}');

insert into public.email_templates (institution_id, key, locale, status, subject, body, approved_at)
select 'aaaaaaaa-0000-4000-8000-00000000d002', key, locale, 'approved', subject, body, now()
from public.email_templates where institution_id is null;

-- Accounts ----------------------------------------------------------------------------------------------------

with accounts (id, email, name) as (values
  ('11111111-d002-4111-8111-000000000001'::uuid, 'admin@hebrew-academy.test', 'Miriam Klein'),
  ('11111111-d002-4111-8111-000000000002'::uuid, 'reviewer@hebrew-academy.test', 'Avi Rosenberg'),
  ('11111111-d002-4111-8111-000000000003'::uuid, 'alumni@hebrew-academy.test', 'Daniel Weiss'),
  ('11111111-d002-4111-8111-000000000004'::uuid, 'pending@hebrew-academy.test', 'Tova Friedman'),
  ('11111111-d002-4111-8111-000000000005'::uuid, 'pending2@hebrew-academy.test', 'Eli Azoulay'),
  ('11111111-d002-4111-8111-000000000006'::uuid, 'needsinfo@hebrew-academy.test', 'Shira Gold')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated', a.email,
  extensions.crypt('LocalDev-Passw0rd', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('locale', 'en', 'person_name', a.name),
  now(), now(), '', '', '', ''
from accounts a;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
from auth.users u
where u.id::text like '11111111-d002-4111-8111-%';

insert into public.institution_memberships (institution_id, user_id, role, status, status_reason) values
  ('aaaaaaaa-0000-4000-8000-00000000d002', '11111111-d002-4111-8111-000000000001', 'school_admin', 'active', null),
  ('aaaaaaaa-0000-4000-8000-00000000d002', '11111111-d002-4111-8111-000000000002', 'reviewer', 'active', null),
  ('aaaaaaaa-0000-4000-8000-00000000d002', '11111111-d002-4111-8111-000000000003', 'alumni', 'active', null);

insert into public.access_requests (id, institution_id, user_id, email, first_name, last_name, maiden_name, grad_year, note,
  status, info_request, decision_reason, decided_by, decided_at, created_at) values
  ('33333333-d002-4333-8333-000000000001', 'aaaaaaaa-0000-4000-8000-00000000d002', '11111111-d002-4111-8111-000000000004',
   'pending@hebrew-academy.test', 'Tova', 'Friedman', 'Berger', 2006,
   'Class of 2006, I was Tova Berger then. Spent my year at Midreshet Lindenbaum.',
   'pending', null, null, null, null, now() - interval '2 days'),
  ('33333333-d002-4333-8333-000000000002', 'aaaaaaaa-0000-4000-8000-00000000d002', '11111111-d002-4111-8111-000000000005',
   'pending2@hebrew-academy.test', 'Eli', 'Azoulay', null, 2018, null,
   'pending', null, null, null, null, now() - interval '9 hours'),
  ('33333333-d002-4333-8333-000000000003', 'aaaaaaaa-0000-4000-8000-00000000d002', '11111111-d002-4111-8111-000000000006',
   'needsinfo@hebrew-academy.test', 'Shira', 'Gold', null, 1999, null,
   'needs_info', 'Which homeroom were you in during Secondary 5?', null, '11111111-d002-4111-8111-000000000002',
   now() - interval '3 days', now() - interval '4 days'),
  ('33333333-d002-4333-8333-000000000004', 'aaaaaaaa-0000-4000-8000-00000000d002', '11111111-d002-4111-8111-000000000003',
   'alumni@hebrew-academy.test', 'Daniel', 'Weiss', null, 2010, null,
   'approved', null, null, '11111111-d002-4111-8111-000000000002', now() - interval '20 days', now() - interval '21 days');

-- Demo alumni: 150 fictional graduates, about two in three with a yeshiva or seminary year ----------------------

create temporary table demo (
  id uuid, g int, female boolean, first_name text, last_name text, grad_year int, field text, job_title text,
  employer text, city text, country text, university text, bio text
);

insert into demo
select ('00000000-d002-4000-8000-' || lpad(g::text, 12, '0'))::uuid, g, g % 2 = 0,
  case when g % 2 = 0
    then (array['Rachel','Leah','Sarah','Rivka','Tamar','Chana','Esther','Shira','Ariella','Talia','Yael','Naomi',
      'Avigail','Elisheva','Miriam','Dina','Batsheva','Hadassah','Noa','Michal'])[1 + (g * 7) % 20]
    else (array['Daniel','Jonathan','David','Ari','Benjamin','Eli','Michael','Yoni','Josh','Avi','Ezra','Noam',
      'Aaron','Jacob','Ethan','Zev','Moshe','Natan','Gabriel','Shimon'])[1 + (g * 7) % 20] end,
  (array['Weiss','Goldberg','Rosenberg','Friedman','Klein','Schwartz','Cohen','Levy','Katz','Stern','Adler','Berger',
    'Gold','Shapiro','Feldman','Kaplan','Bensimon','Azoulay','Elbaz','Ohana','Abitbol','Lerner','Margolis','Zucker',
    'Rabinovitch','Segal','Greenberg','Weinstock','Mandel','Lowy','Herskovits','Pinsky','Teitelbaum','Ackerman',
    'Hollander','Schachter','Wolfe','Reich','Spiegel','Dahan','Sebag'])[1 + (g * 13) % 41],
  1976 + (g * 17) % 50, w.field[i.k],
  case when g % 2 = 0 then w.title_f[i.k] else w.title_m[i.k] end,
  w.employer[i.k], c.city[i.m], c.country[i.m],
  u.university[1 + (g * 3) % array_length(u.university, 1)],
  (array['Happy to talk with graduates deciding what to study.',
    'Glad to help alumni settling in a new city.',
    'Always up for a coffee with someone from Hebrew Academy.',
    'I take Hebrew Academy students for a day of shadowing.',
    'Happy to share how I got where I am with Secondary 5 students.'])[1 + (g * 11) % 5]
from generate_series(1, 150) g
cross join (select
  array['medicine','law','technology','finance','entrepreneurship','dentistry','architecture','technology',
    'finance','psychology','engineering','consulting'] as field,
  array['Family Physician','Corporate Lawyer','Software Engineer','Portfolio Manager','Co-founder and CEO',
    'Orthodontist','Architect','Product Manager','CPA, Partner','Clinical Psychologist','Civil Engineer',
    'Strategy Consultant'] as title_m,
  array['Family Physician','Corporate Lawyer','Software Engineer','Portfolio Manager','Co-founder and CEO',
    'Orthodontist','Architect','Product Manager','CPA, Partner','Clinical Psychologist','Civil Engineer',
    'Strategy Consultant'] as title_f,
  array['Jewish General Hospital','Davies Ward Phillips & Vineberg','Shopify','CDPQ','Northline Labs',
    'Côte-Saint-Luc Dental','Lemay','Lightspeed','Richter','Private Practice','WSP','McKinsey & Company'] as employer) w
cross join (select
  array['Montreal','Montreal','Toronto','New York','Jerusalem','Montreal','Tel Aviv','Côte-Saint-Luc','Boca Raton',
    'Montreal','Teaneck'] as city,
  array['Canada','Canada','Canada','USA','Israel','Canada','Israel','Canada','USA','Canada','USA'] as country) c
cross join (select
  array['McGill University','Concordia University','Yeshiva University','University of Toronto',
    'Hebrew University of Jerusalem','Bar-Ilan University','Université de Montréal','Touro University',
    'Columbia University','HEC Montréal'] as university) u
cross join lateral (select 1 + (g * 5) % 12 as k, 1 + (g * 7) % 11 as m) i;

update demo set bio = 'Hebrew Academy class of ' || grad_year || '. ' || bio;

-- The signed-in alumnus is profile 1: Daniel Weiss, class of 2010, a year at Har Etzion.
update demo set female = false, first_name = 'Daniel', last_name = 'Weiss', grad_year = 2010, field = 'law',
  job_title = 'Corporate Lawyer', employer = 'Davies Ward Phillips & Vineberg', city = 'Montreal', country = 'Canada',
  university = 'McGill University',
  bio = 'Hebrew Academy class of 2010. Corporate lawyer in Montreal; happy to advise alumni heading into law.'
where g = 1;
-- Profile 2: Rachel Goldberg, class of 2001, seminary then medicine. The one the demo searches for.
update demo set female = true, first_name = 'Rachel', last_name = 'Goldberg', grad_year = 2001, field = 'medicine',
  job_title = 'Cardiologist', employer = 'Jewish General Hospital', city = 'Montreal', country = 'Canada',
  university = 'McGill University',
  bio = 'Hebrew Academy class of 2001. Cardiologist at the Jewish General. I mentor alumni aiming for medicine and host students for a day of shadowing.'
where g = 2;

insert into public.alumni_profiles (id, institution_id, status, visibility, first_name, last_name, grad_year, city, country,
  bio, job_title, employer, career_field_id, languages, onboarding_step, onboarding_completed_at, published_at,
  last_confirmed_at, confirmation_due_at)
select d.id, 'aaaaaaaa-0000-4000-8000-00000000d002', 'active', 'members', d.first_name, d.last_name, d.grad_year, d.city,
  d.country, d.bio, d.job_title, d.employer, cf.id,
  case when d.g % 3 = 0 then array['en', 'fr', 'he'] else array['en', 'he'] end,
  7, now(), now() - (d.g % 37) * interval '1 day' - (d.g % 5) * interval '1 hour',
  now(), now() + interval '12 months'
from demo d
left join public.career_fields cf on cf.institution_id is null and cf.key = d.field;

insert into public.alumni_private (profile_id, institution_id)
select id, institution_id from public.alumni_profiles where id::text like '00000000-d002-4000-8000-%';

insert into public.alumni_education (profile_id, institution_id, school, sort_order)
select d.id, 'aaaaaaaa-0000-4000-8000-00000000d002', d.university, 1 from demo d;

insert into public.alumni_experience (profile_id, institution_id, job_title, employer, career_field_id, location, is_current, sort_order)
select p.id, p.institution_id, p.job_title, p.employer, p.career_field_id, p.city, true, 1
from public.alumni_profiles p where p.id::text like '00000000-d002-4000-8000-%';

-- Yeshivas for the men, seminaries for the women, the year after high school or after CEGEP. Some stay a second
-- year (shana bet), at the same place. Nobody's year is in the future.
create temporary table places (female boolean, n int, name text, location text);
insert into places values
  (false, 1, 'Yeshivat Har Etzion', 'Alon Shvut'), (false, 2, 'Yeshivat HaKotel', 'Jerusalem'),
  (false, 3, 'Yeshivat Sha''alvim', 'Sha''alvim'), (false, 4, 'Yeshivat Orayta', 'Jerusalem'),
  (false, 5, 'Yeshivat Hamivtar', 'Efrat'), (false, 6, 'Yeshivat Torat Shraga', 'Jerusalem'),
  (false, 7, 'Yeshivat Lev HaTorah', 'Ramat Beit Shemesh'), (false, 8, 'Yeshivat Migdal HaTorah', 'Modi''in'),
  (true, 1, 'Midreshet Lindenbaum', 'Jerusalem'), (true, 2, 'Michlalah Jerusalem College', 'Jerusalem'),
  (true, 3, 'Midreshet Moriah', 'Jerusalem'), (true, 4, 'Tiferet', 'Ramat Beit Shemesh'),
  (true, 5, 'Midreshet HaRova', 'Jerusalem'), (true, 6, 'Michlelet Mevaseret Yerushalayim (MMY)', 'Jerusalem'),
  (true, 7, 'Sha''alvim for Women', 'Sha''alvim'), (true, 8, 'Midreshet Torah V''Avodah', 'Jerusalem');

insert into public.alumni_yeshiva (profile_id, institution_id, name, location, start_year, end_year, sort_order)
select d.id, 'aaaaaaaa-0000-4000-8000-00000000d002', p.name, p.location, s.start_year,
  s.start_year + case when d.g % 4 = 1 then 2 else 1 end, 1
from demo d
cross join lateral (select d.grad_year + case when d.g % 3 = 0 then 2 else 0 end as start_year) s
join places p on p.female = d.female and p.n = 1 + ((d.g / 2) * 3) % 8
where (d.g % 3 <> 2 or d.g <= 2)
  and s.start_year + case when d.g % 4 = 1 then 2 else 1 end <= 2026;

-- The two demo profiles get places the demo names.
update public.alumni_yeshiva set name = 'Yeshivat Har Etzion', location = 'Alon Shvut', start_year = 2010, end_year = 2011
where profile_id = '00000000-d002-4000-8000-000000000001';
update public.alumni_yeshiva set name = 'Midreshet Lindenbaum', location = 'Jerusalem', start_year = 2001, end_year = 2002
where profile_id = '00000000-d002-4000-8000-000000000002';

insert into public.profile_contact_channels (profile_id, institution_id, type, value, is_public, sort_order)
select d.id, 'aaaaaaaa-0000-4000-8000-00000000d002'::uuid, 'linkedin'::public.channel_type,
  'https://www.linkedin.com/in/' || lower(d.first_name || '-' || d.last_name) || case when d.g <= 2 then '' else '-' || d.g end,
  true, 1
from demo d
union all
select d.id, 'aaaaaaaa-0000-4000-8000-00000000d002'::uuid, 'email'::public.channel_type,
  lower(d.first_name || '.' || d.last_name) || case when d.g <= 2 then '' else '.' || d.g end || '@example.test', true, 2
from demo d;

insert into public.profile_offers (profile_id, offer_type_id, institution_id)
select d.id, o.id, 'aaaaaaaa-0000-4000-8000-00000000d002'
from demo d
cross join lateral (values
  ('mentoring', d.g % 3 = 0 or d.g <= 2), ('career_advice', d.g % 2 = 0 or d.g = 1), ('job_opportunities', d.g % 5 = 0),
  ('offering_jobs', d.g % 7 = 0), ('offering_internships', d.g % 6 = 1), ('shadowing', d.g % 8 = 3 or d.g = 2),
  ('speaking', d.g % 9 = 4), ('networking', d.g % 4 = 1), ('entrepreneurship', d.g % 10 = 5)
) as v(key, enabled)
join public.offer_types o on o.institution_id is null and o.key = v.key
where v.enabled;

update public.alumni_profiles set user_id = '11111111-d002-4111-8111-000000000003'
where id = '00000000-d002-4000-8000-000000000001';
update public.access_requests set profile_id = '00000000-d002-4000-8000-000000000001'
where id = '33333333-d002-4333-8333-000000000004';

insert into public.consents (institution_id, user_id, document, version) values
  ('aaaaaaaa-0000-4000-8000-00000000d002', '11111111-d002-4111-8111-000000000003', 'terms', '2026-10'),
  ('aaaaaaaa-0000-4000-8000-00000000d002', '11111111-d002-4111-8111-000000000003', 'privacy_policy', '2026-10'),
  ('aaaaaaaa-0000-4000-8000-00000000d002', '11111111-d002-4111-8111-000000000003', 'directory_publication', '2026-10');

-- An unclaimed class-list record under Tova's maiden name, suggested to staff for her pending sign-up.
insert into public.alumni_profiles (id, institution_id, first_name, last_name, grad_year)
values ('22222222-d002-4222-8222-000000000099', 'aaaaaaaa-0000-4000-8000-00000000d002', 'Tova', 'Berger', 2006);

drop table places;
drop table demo;
