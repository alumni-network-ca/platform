-- Local and staging seed data for the v2 schema. NEVER applied to production (ADR 0003).
-- Applied automatically by `supabase start` and `supabase db reset`.
--
-- Contents:
--   1. Two schools: herzliah (with approved email templates) and test-school (for isolation tests)
--   2. Local test accounts (.test addresses are reserved and never deliverable). Password for all (local only):
--      LocalDev-Passw0rd
--        admin@herzliah.test       school admin of herzliah (no alumni profile)
--        reviewer@herzliah.test    reviewer of herzliah (no alumni profile)
--        alumni@herzliah.test      approved, published alumnus (owns the "Ari Benaroch" demo profile)
--        pending@herzliah.test     signed up and verified, access request pending
--        alumni@test-school.test   approved, published alumnus of test-school
--        system@alumninetwork.test system admin (platform level, no school membership)
--   3. 50 fictional Herzliah demo alumni, published, with education, experience, offers and channels
--   4. Edge-case records for access tests: a hidden member and an unclaimed record

-- 1. Schools -------------------------------------------------------------------------------------------

insert into public.institutions (id, name, slug, default_locale, reply_to_email, email_display_name) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Herzliah High School', 'herzliah', 'en', 'alumni@herzliah.test', 'Herzliah Alumni Network'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Test School', 'test-school', 'fr', 'office@test-school.test', 'Test School Alumni');

-- Herzliah approves the platform defaults as-is, so emails flow in local development.
insert into public.email_templates (institution_id, key, locale, status, subject, body, approved_at)
select 'aaaaaaaa-0000-4000-8000-000000000001', key, locale, 'approved', subject, body, now()
from public.email_templates where institution_id is null;

-- 2. Accounts ------------------------------------------------------------------------------------------

with accounts (id, email) as (values
  ('11111111-1111-4111-8111-000000000001'::uuid, 'admin@herzliah.test'),
  ('11111111-1111-4111-8111-000000000002'::uuid, 'alumni@herzliah.test'),
  ('11111111-1111-4111-8111-000000000003'::uuid, 'pending@herzliah.test'),
  ('11111111-1111-4111-8111-000000000004'::uuid, 'reviewer@herzliah.test'),
  ('11111111-1111-4111-8111-000000000005'::uuid, 'alumni@test-school.test'),
  ('11111111-1111-4111-8111-000000000006'::uuid, 'system@alumninetwork.test')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated', a.email,
  extensions.crypt('LocalDev-Passw0rd', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"locale":"en"}', now(), now(), '', '', '', ''
from accounts a;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
from auth.users u
where u.id::text like '11111111-1111-4111-8111-%';

insert into public.platform_admins (user_id) values ('11111111-1111-4111-8111-000000000006');

insert into public.institution_memberships (institution_id, user_id, role) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000001', 'school_admin'),
  ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000004', 'reviewer'),
  ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000002', 'alumni'),
  ('aaaaaaaa-0000-4000-8000-000000000002', '11111111-1111-4111-8111-000000000005', 'alumni');

insert into public.access_requests (id, institution_id, user_id, email, first_name, last_name, maiden_name, grad_year, note) values
  ('33333333-3333-4333-8333-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000003',
   'pending@herzliah.test', 'Penny', 'Pending', 'Levi', 2012, 'Class of 2012, homeroom with Mrs. Cohen.');

-- 3. Demo alumni ---------------------------------------------------------------------------------------

create temporary table demo (
  id uuid, first_name text, last_name text, grad_year int, profession text, industry text, job_title text,
  employer text, city text, country text, university text, bio text
);

insert into demo values
  ('00000000-0000-4000-8000-000000000001'::uuid,'Ari','Benaroch',1988,'Physician','Healthcare','Family Physician','Jewish General Hospital','Montreal','Canada','McGill University','Herzliah class of 1988. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000002'::uuid,'Maya','Frenkel',1991,'Lawyer','Law','Corporate Lawyer','Fasken','Toronto','Canada','Université de Montréal','Herzliah class of 1991. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000003'::uuid,'David','Abitan',1994,'Software Engineer','Technology','Senior Software Engineer','Google','New York','USA','Concordia University','Herzliah class of 1994. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000004'::uuid,'Sarah','Amar',1997,'Finance','Finance','Investment Analyst','CDPQ','Boston','USA','University of Toronto','Herzliah class of 1997. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000005'::uuid,'Jonathan','Cohen',2000,'Entrepreneur','Entrepreneurship','Founder','Northstar Ventures','Vancouver','Canada','Queen’s University','Herzliah class of 2000. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000006'::uuid,'Emma','Levy',2003,'Dentist','Healthcare','Dentist','Westmount Dental','Miami','USA','Western University','Herzliah class of 2003. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000007'::uuid,'Noah','Segal',2006,'Architect','Architecture','Architect','Provencher_Roy','Los Angeles','USA','NYU','Herzliah class of 2006. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000008'::uuid,'Leah','Kessler',2009,'Product Manager','Technology','Product Manager','Shopify','Tel Aviv','Israel','Harvard University','Herzliah class of 2009. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000009'::uuid,'Daniel','Berger',2012,'Accountant','Finance','CPA','Deloitte','Montreal','Canada','McGill University','Herzliah class of 2012. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000010'::uuid,'Rachel','Azoulay',2015,'Psychologist','Healthcare','Clinical Psychologist','Private Practice','Toronto','Canada','Université de Montréal','Herzliah class of 2015. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000011'::uuid,'Adam','Bensimon',2018,'Engineer','Engineering','Civil Engineer','WSP','New York','USA','Concordia University','Herzliah class of 2018. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000012'::uuid,'Talia','Dahan',2021,'Consultant','Consulting','Strategy Consultant','McKinsey & Company','Boston','USA','University of Toronto','Herzliah class of 2021. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000013'::uuid,'Ethan','Elbaz',2024,'Physician','Healthcare','Family Physician','Jewish General Hospital','Vancouver','Canada','Queen’s University','Herzliah class of 2024. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000014'::uuid,'Rebecca','Friedman',1989,'Lawyer','Law','Corporate Lawyer','Fasken','Miami','USA','Western University','Herzliah class of 1989. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000015'::uuid,'Joshua','Goldberg',1992,'Software Engineer','Technology','Senior Software Engineer','Google','Los Angeles','USA','NYU','Herzliah class of 1992. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000016'::uuid,'Naomi','Haddad',1995,'Finance','Finance','Investment Analyst','CDPQ','Tel Aviv','Israel','Harvard University','Herzliah class of 1995. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000017'::uuid,'Benjamin','Israel',1998,'Entrepreneur','Entrepreneurship','Founder','Northstar Ventures','Montreal','Canada','McGill University','Herzliah class of 1998. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000018'::uuid,'Miriam','Jacobs',2001,'Dentist','Healthcare','Dentist','Westmount Dental','Toronto','Canada','Université de Montréal','Herzliah class of 2001. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000019'::uuid,'Samuel','Klein',2004,'Architect','Architecture','Architect','Provencher_Roy','New York','USA','Concordia University','Herzliah class of 2004. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000020'::uuid,'Sophie','Lazar',2007,'Product Manager','Technology','Product Manager','Shopify','Boston','USA','University of Toronto','Herzliah class of 2007. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000021'::uuid,'Nathan','Mizrahi',2010,'Accountant','Finance','CPA','Deloitte','Vancouver','Canada','Queen’s University','Herzliah class of 2010. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000022'::uuid,'Eliana','Nahon',2013,'Psychologist','Healthcare','Clinical Psychologist','Private Practice','Miami','USA','Western University','Herzliah class of 2013. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000023'::uuid,'Jacob','Ohayon',2016,'Engineer','Engineering','Civil Engineer','WSP','Los Angeles','USA','NYU','Herzliah class of 2016. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000024'::uuid,'Alyssa','Perez',2019,'Consultant','Consulting','Strategy Consultant','McKinsey & Company','Tel Aviv','Israel','Harvard University','Herzliah class of 2019. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000025'::uuid,'Michael','Rosen',2022,'Physician','Healthcare','Family Physician','Jewish General Hospital','Montreal','Canada','McGill University','Herzliah class of 2022. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000026'::uuid,'Hannah','Shapiro',2025,'Lawyer','Law','Corporate Lawyer','Fasken','Toronto','Canada','Université de Montréal','Herzliah class of 2025. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000027'::uuid,'Aaron','Stern',1990,'Software Engineer','Technology','Senior Software Engineer','Google','New York','USA','Concordia University','Herzliah class of 1990. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000028'::uuid,'Gabrielle','Toledano',1993,'Finance','Finance','Investment Analyst','CDPQ','Boston','USA','University of Toronto','Herzliah class of 1993. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000029'::uuid,'Isaac','Weiss',1996,'Entrepreneur','Entrepreneurship','Founder','Northstar Ventures','Vancouver','Canada','Queen’s University','Herzliah class of 1996. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000030'::uuid,'Liora','Zerbib',1999,'Dentist','Healthcare','Dentist','Westmount Dental','Miami','USA','Western University','Herzliah class of 1999. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000031'::uuid,'Zachary','Adler',2002,'Architect','Architecture','Architect','Provencher_Roy','Los Angeles','USA','NYU','Herzliah class of 2002. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000032'::uuid,'Dalia','Bitton',2005,'Product Manager','Technology','Product Manager','Shopify','Tel Aviv','Israel','Harvard University','Herzliah class of 2005. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000033'::uuid,'Eli','Chriqui',2008,'Accountant','Finance','CPA','Deloitte','Montreal','Canada','McGill University','Herzliah class of 2008. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000034'::uuid,'Shira','Drai',2011,'Psychologist','Healthcare','Clinical Psychologist','Private Practice','Toronto','Canada','Université de Montréal','Herzliah class of 2011. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000035'::uuid,'Max','Elmaleh',2014,'Engineer','Engineering','Civil Engineer','WSP','New York','USA','Concordia University','Herzliah class of 2014. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000036'::uuid,'Aviva','Feldman',2017,'Consultant','Consulting','Strategy Consultant','McKinsey & Company','Boston','USA','University of Toronto','Herzliah class of 2017. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000037'::uuid,'Jonah','Gabay',2020,'Physician','Healthcare','Family Physician','Jewish General Hospital','Vancouver','Canada','Queen’s University','Herzliah class of 2020. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000038'::uuid,'Nina','Hazan',2023,'Lawyer','Law','Corporate Lawyer','Fasken','Miami','USA','Western University','Herzliah class of 2023. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000039'::uuid,'Gabriel','Ifergan',1988,'Software Engineer','Technology','Senior Software Engineer','Google','Los Angeles','USA','NYU','Herzliah class of 1988. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000040'::uuid,'Yael','Jasmin',1991,'Finance','Finance','Investment Analyst','CDPQ','Tel Aviv','Israel','Harvard University','Herzliah class of 1991. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000041'::uuid,'Simon','Katz',1994,'Entrepreneur','Entrepreneurship','Founder','Northstar Ventures','Montreal','Canada','McGill University','Herzliah class of 1994. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000042'::uuid,'Tamar','Lasry',1997,'Dentist','Healthcare','Dentist','Westmount Dental','Toronto','Canada','Université de Montréal','Herzliah class of 1997. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000043'::uuid,'Leo','Marciano',2000,'Architect','Architecture','Architect','Provencher_Roy','New York','USA','Concordia University','Herzliah class of 2000. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000044'::uuid,'Rina','Nessim',2003,'Product Manager','Technology','Product Manager','Shopify','Boston','USA','University of Toronto','Herzliah class of 2003. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000045'::uuid,'Evan','Oren',2006,'Accountant','Finance','CPA','Deloitte','Vancouver','Canada','Queen’s University','Herzliah class of 2006. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000046'::uuid,'Mia','Pinto',2009,'Psychologist','Healthcare','Clinical Psychologist','Private Practice','Miami','USA','Western University','Herzliah class of 2009. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000047'::uuid,'Julian','Roth',2012,'Engineer','Engineering','Civil Engineer','WSP','Los Angeles','USA','NYU','Herzliah class of 2012. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000048'::uuid,'Amelia','Sasson',2015,'Consultant','Consulting','Strategy Consultant','McKinsey & Company','Tel Aviv','Israel','Harvard University','Herzliah class of 2015. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000049'::uuid,'Alex','Touati',2018,'Physician','Healthcare','Family Physician','Jewish General Hospital','Montreal','Canada','McGill University','Herzliah class of 2018. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.'),
  ('00000000-0000-4000-8000-000000000050'::uuid,'Dana','Vidal',2021,'Lawyer','Law','Corporate Lawyer','Fasken','Toronto','Canada','Université de Montréal','Herzliah class of 2021. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.');

insert into public.alumni_profiles (id, institution_id, status, visibility, first_name, last_name, grad_year, city, country,
  bio, job_title, employer, career_field_id, languages, onboarding_step, onboarding_completed_at, published_at,
  last_confirmed_at, confirmation_due_at)
select d.id, 'aaaaaaaa-0000-4000-8000-000000000001', 'active', 'members', d.first_name, d.last_name, d.grad_year, d.city,
  d.country, d.bio, d.job_title, d.employer, cf.id, array['en', 'fr'], 7, now(), now(), now(), now() + interval '12 months'
from demo d
left join public.career_fields cf on cf.institution_id is null and cf.key = case d.profession
  when 'Physician' then 'medicine' when 'Dentist' then 'dentistry' when 'Lawyer' then 'law'
  when 'Software Engineer' then 'technology' when 'Product Manager' then 'technology'
  when 'Finance' then 'finance' when 'Accountant' then 'finance' when 'Entrepreneur' then 'entrepreneurship'
  when 'Architect' then 'architecture' when 'Psychologist' then 'psychology' when 'Engineer' then 'engineering'
  when 'Consultant' then 'consulting' else 'other' end;

insert into public.alumni_private (profile_id, institution_id)
select id, institution_id from public.alumni_profiles where id::text like '00000000-0000-4000-8000-%';

insert into public.alumni_education (profile_id, institution_id, school, sort_order)
select d.id, 'aaaaaaaa-0000-4000-8000-000000000001', d.university, 1 from demo d;

insert into public.alumni_experience (profile_id, institution_id, job_title, employer, career_field_id, location, is_current, sort_order)
select p.id, p.institution_id, p.job_title, p.employer, p.career_field_id, p.city, true, 1
from public.alumni_profiles p where p.id::text like '00000000-0000-4000-8000-%';

-- Every demo alumnus shows LinkedIn (readable by members) and email (revealed per click via initiate_contact).
insert into public.profile_contact_channels (profile_id, institution_id, type, value, is_public, sort_order)
select d.id, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, 'linkedin'::public.channel_type,
  'https://www.linkedin.com/in/' || lower(d.first_name || '-' || d.last_name), true, 1
from demo d
union all
select d.id, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, 'email'::public.channel_type,
  lower(d.first_name || '.' || d.last_name) || '@example.test', true, 2
from demo d;

create temporary table demo_flags (
  profile_id uuid, mentoring boolean, career_advice boolean, job_opportunities boolean, offering_jobs boolean,
  offering_internships boolean, shadowing boolean, speaking boolean, networking boolean, entrepreneurship boolean
);

insert into demo_flags values
  ('00000000-0000-4000-8000-000000000001'::uuid,true,false,true,true,true,true,true,false,false),
  ('00000000-0000-4000-8000-000000000002'::uuid,false,true,false,false,false,false,false,true,true),
  ('00000000-0000-4000-8000-000000000003'::uuid,true,true,false,false,false,false,false,false,false),
  ('00000000-0000-4000-8000-000000000004'::uuid,false,false,false,false,false,false,true,true,false),
  ('00000000-0000-4000-8000-000000000005'::uuid,true,true,false,false,true,false,false,false,false),
  ('00000000-0000-4000-8000-000000000006'::uuid,false,true,false,true,false,false,false,true,false),
  ('00000000-0000-4000-8000-000000000007'::uuid,true,false,false,false,false,true,true,false,true),
  ('00000000-0000-4000-8000-000000000008'::uuid,false,true,true,false,false,false,false,true,false),
  ('00000000-0000-4000-8000-000000000009'::uuid,true,true,false,false,true,false,false,false,false),
  ('00000000-0000-4000-8000-000000000010'::uuid,false,false,false,false,false,false,true,true,false),
  ('00000000-0000-4000-8000-000000000011'::uuid,true,true,false,true,false,false,false,false,false),
  ('00000000-0000-4000-8000-000000000012'::uuid,false,true,false,false,false,false,false,true,true),
  ('00000000-0000-4000-8000-000000000013'::uuid,true,false,false,false,true,true,true,false,false),
  ('00000000-0000-4000-8000-000000000014'::uuid,false,true,false,false,false,false,false,true,false),
  ('00000000-0000-4000-8000-000000000015'::uuid,true,true,true,false,false,false,false,false,false),
  ('00000000-0000-4000-8000-000000000016'::uuid,false,false,false,true,false,false,true,true,false),
  ('00000000-0000-4000-8000-000000000017'::uuid,true,true,false,false,true,false,false,false,true),
  ('00000000-0000-4000-8000-000000000018'::uuid,false,true,false,false,false,false,false,true,false),
  ('00000000-0000-4000-8000-000000000019'::uuid,true,false,false,false,false,true,true,false,false),
  ('00000000-0000-4000-8000-000000000020'::uuid,false,true,false,false,false,false,false,true,false),
  ('00000000-0000-4000-8000-000000000021'::uuid,true,true,false,true,true,false,false,false,false),
  ('00000000-0000-4000-8000-000000000022'::uuid,false,false,true,false,false,false,true,true,true),
  ('00000000-0000-4000-8000-000000000023'::uuid,true,true,false,false,false,false,false,false,false),
  ('00000000-0000-4000-8000-000000000024'::uuid,false,true,false,false,false,false,false,true,false),
  ('00000000-0000-4000-8000-000000000025'::uuid,true,false,false,false,true,true,true,false,false),
  ('00000000-0000-4000-8000-000000000026'::uuid,false,true,false,true,false,false,false,true,false),
  ('00000000-0000-4000-8000-000000000027'::uuid,true,true,false,false,false,false,false,false,true),
  ('00000000-0000-4000-8000-000000000028'::uuid,false,false,false,false,false,false,true,true,false),
  ('00000000-0000-4000-8000-000000000029'::uuid,true,true,true,false,true,false,false,false,false),
  ('00000000-0000-4000-8000-000000000030'::uuid,false,true,false,false,false,false,false,true,false),
  ('00000000-0000-4000-8000-000000000031'::uuid,true,false,false,true,false,true,true,false,false),
  ('00000000-0000-4000-8000-000000000032'::uuid,false,true,false,false,false,false,false,true,true),
  ('00000000-0000-4000-8000-000000000033'::uuid,true,true,false,false,true,false,false,false,false),
  ('00000000-0000-4000-8000-000000000034'::uuid,false,false,false,false,false,false,true,true,false),
  ('00000000-0000-4000-8000-000000000035'::uuid,true,true,false,false,false,false,false,false,false),
  ('00000000-0000-4000-8000-000000000036'::uuid,false,true,true,true,false,false,false,true,false),
  ('00000000-0000-4000-8000-000000000037'::uuid,true,false,false,false,true,true,true,false,true),
  ('00000000-0000-4000-8000-000000000038'::uuid,false,true,false,false,false,false,false,true,false),
  ('00000000-0000-4000-8000-000000000039'::uuid,true,true,false,false,false,false,false,false,false),
  ('00000000-0000-4000-8000-000000000040'::uuid,false,false,false,false,false,false,true,true,false),
  ('00000000-0000-4000-8000-000000000041'::uuid,true,true,false,true,true,false,false,false,false),
  ('00000000-0000-4000-8000-000000000042'::uuid,false,true,false,false,false,false,false,true,true),
  ('00000000-0000-4000-8000-000000000043'::uuid,true,false,true,false,false,true,true,false,false),
  ('00000000-0000-4000-8000-000000000044'::uuid,false,true,false,false,false,false,false,true,false),
  ('00000000-0000-4000-8000-000000000045'::uuid,true,true,false,false,true,false,false,false,false),
  ('00000000-0000-4000-8000-000000000046'::uuid,false,false,false,true,false,false,true,true,false),
  ('00000000-0000-4000-8000-000000000047'::uuid,true,true,false,false,false,false,false,false,true),
  ('00000000-0000-4000-8000-000000000048'::uuid,false,true,false,false,false,false,false,true,false),
  ('00000000-0000-4000-8000-000000000049'::uuid,true,false,false,false,true,true,true,false,false),
  ('00000000-0000-4000-8000-000000000050'::uuid,false,true,true,false,false,false,false,true,false);

insert into public.profile_offers (profile_id, offer_type_id, institution_id)
select f.profile_id, o.id, 'aaaaaaaa-0000-4000-8000-000000000001'
from demo_flags f
cross join lateral (values
  ('mentoring', f.mentoring), ('career_advice', f.career_advice), ('job_opportunities', f.job_opportunities),
  ('offering_jobs', f.offering_jobs), ('offering_internships', f.offering_internships), ('shadowing', f.shadowing),
  ('speaking', f.speaking), ('networking', f.networking), ('entrepreneurship', f.entrepreneurship)
) as v(key, enabled)
join public.offer_types o on o.institution_id is null and o.key = v.key
where v.enabled;

-- The alumni@herzliah.test account owns Ari Benaroch's profile, and consented to publication.
update public.alumni_profiles set user_id = '11111111-1111-4111-8111-000000000002'
where id = '00000000-0000-4000-8000-000000000001';

insert into public.consents (institution_id, user_id, document, version) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000002', 'terms', '2026-10'),
  ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000002', 'privacy_policy', '2026-10'),
  ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-000000000002', 'directory_publication', '2026-10');

-- 4. Edge cases ----------------------------------------------------------------------------------------

insert into public.alumni_profiles (id, institution_id, user_id, status, visibility, first_name, last_name, grad_year,
  onboarding_completed_at, published_at, last_confirmed_at)
values
  -- Unclaimed record (the shape a future CSV import creates): no login, hidden.
  ('22222222-2222-4222-8222-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', null, 'active', 'hidden',
   'Imported', 'Unclaimed', 2010, null, null, null),
  -- An approved member who chose to stay hidden.
  ('22222222-2222-4222-8222-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', null, 'active', 'hidden',
   'Hidden', 'Member', 2005, now(), null, now()),
  -- test-school's published alumnus.
  ('22222222-2222-4222-8222-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002', '11111111-1111-4111-8111-000000000005',
   'active', 'members', 'Other', 'School', 2015, now(), now(), now());

insert into public.alumni_private (profile_id, institution_id, maiden_name, admin_notes) values
  ('22222222-2222-4222-8222-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', null, 'Record kept for import tests'),
  ('22222222-2222-4222-8222-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'Secretname', null),
  ('22222222-2222-4222-8222-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002', null, 'test-school private note');

insert into public.alumni_experience (profile_id, institution_id, job_title, employer, is_current) values
  ('22222222-2222-4222-8222-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'Private role', 'Private employer', true),
  ('22222222-2222-4222-8222-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002', 'Teacher', 'Other employer', true);

insert into public.profile_contact_channels (profile_id, institution_id, type, value, is_public) values
  ('22222222-2222-4222-8222-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'email', 'hidden.member@example.test', true),
  ('22222222-2222-4222-8222-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002', 'email', 'other.school@example.test', true),
  ('22222222-2222-4222-8222-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002', 'linkedin', 'https://www.linkedin.com/in/other-school', true);

drop table demo;
drop table demo_flags;
