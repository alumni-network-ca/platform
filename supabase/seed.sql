-- Local and staging seed data. NEVER applied to production (ADR 0003).
-- Applied automatically by `supabase start` and `supabase db reset`.
--
-- Contents:
--   1. 50 fictional Herzliah demo alumni (from the V3 demo migration) with availability flags
--   2. Demo clean-up from migration 004: career fields, education and current-experience rows
--   3. Local test accounts (.test addresses are reserved and never deliverable):
--        admin@herzliah.test    super admin of herzliah (platform operator)
--        alumni@herzliah.test   claimed, onboarded alumnus (owns the "Ari Benaroch" demo profile)
--        pending@herzliah.test  signed up and verified, but no membership yet
--      Password for all three (local only): LocalDev-Passw0rd

-- 1. Demo alumni -------------------------------------------------------------------------------

with inst as (select id from public.institutions where slug='herzliah'),
seed(id,first_name,last_name,grad_year,profession,industry,job_title,current_employer,current_city,current_country,university,bio) as (values
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
  ('00000000-0000-4000-8000-000000000050'::uuid,'Dana','Vidal',2021,'Lawyer','Law','Corporate Lawyer','Fasken','Toronto','Canada','Université de Montréal','Herzliah class of 2021. Interested in connecting with fellow alumni and supporting the next generation through professional introductions and community involvement.')
)
insert into public.alumni_profiles(id,institution_id,first_name,last_name,grad_year,profession,industry,job_title,current_employer,current_city,current_country,universities,bio,privacy_preset,contact_allowed,is_directory_visible,claimed_at,last_confirmed_at)
select s.id,i.id,s.first_name,s.last_name,s.grad_year,s.profession,s.industry,s.job_title,s.current_employer,s.current_city,s.current_country,array[s.university],s.bio,'alumni_only',true,true,now(),now() from seed s cross join inst i
on conflict (id) do update set first_name=excluded.first_name,last_name=excluded.last_name,grad_year=excluded.grad_year,profession=excluded.profession,industry=excluded.industry,job_title=excluded.job_title,current_employer=excluded.current_employer,current_city=excluded.current_city,current_country=excluded.current_country,universities=excluded.universities,bio=excluded.bio,is_directory_visible=true,claimed_at=coalesce(public.alumni_profiles.claimed_at,now());

with inst as (select id from public.institutions where slug='herzliah'),
flags(profile_id,mentoring,career_advice,job_opportunities,offering_jobs,offering_internships,shadowing,speaking,networking,entrepreneurship) as (values
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
  ('00000000-0000-4000-8000-000000000050'::uuid,false,true,true,false,false,false,false,true,false)
)
insert into public.availability_flags(profile_id,institution_id,mentoring,career_advice,job_opportunities,offering_jobs,offering_internships,shadowing,speaking,networking,entrepreneurship)
select f.profile_id,i.id,f.mentoring,f.career_advice,f.job_opportunities,f.offering_jobs,f.offering_internships,f.shadowing,f.speaking,f.networking,f.entrepreneurship from flags f cross join inst i
on conflict (profile_id) do update set mentoring=excluded.mentoring,career_advice=excluded.career_advice,job_opportunities=excluded.job_opportunities,offering_jobs=excluded.offering_jobs,offering_internships=excluded.offering_internships,shadowing=excluded.shadowing,speaking=excluded.speaking,networking=excluded.networking,entrepreneurship=excluded.entrepreneurship;


-- 2. Demo clean-up (moved from migration 004, which ran before any demo rows existed) -------------
update public.alumni_profiles set profession = case
  when profession = 'Physician' then 'Medicine & Healthcare'
  when profession = 'Dentist' then 'Dentistry'
  when profession = 'Lawyer' then 'Law'
  when profession in ('Software Engineer', 'Product Manager') then 'Technology'
  when profession in ('Finance', 'Accountant') then 'Finance & Accounting'
  when profession = 'Entrepreneur' then 'Entrepreneurship'
  when profession = 'Architect' then 'Architecture & Design'
  when profession = 'Psychologist' then 'Psychology & Mental Health'
  when profession = 'Engineer' then 'Engineering'
  when profession = 'Consultant' then 'Consulting'
  else profession end,
  onboarding_completed_at = coalesce(onboarding_completed_at, now())
where id::text like '00000000-0000-4000-8000-%';

insert into public.alumni_education (profile_id, institution_id, school, sort_order)
select p.id, p.institution_id, u.school, 0
from public.alumni_profiles p
cross join lateral unnest(p.universities) as u(school)
where p.id::text like '00000000-0000-4000-8000-%'
  and not exists (select 1 from public.alumni_education e where e.profile_id = p.id);

insert into public.alumni_experience (profile_id, institution_id, job_title, employer, career_field, location, is_current, sort_order)
select p.id, p.institution_id, coalesce(p.job_title, 'Current role'), coalesce(p.current_employer, ''), p.profession, p.current_city, true, 0
from public.alumni_profiles p
where p.id::text like '00000000-0000-4000-8000-%'
  and not exists (select 1 from public.alumni_experience e where e.profile_id = p.id and e.is_current);

-- 3. Local test accounts ---------------------------------------------------------------------------
with accounts (id, email) as (values
  ('11111111-1111-4111-8111-000000000001'::uuid, 'admin@herzliah.test'),
  ('11111111-1111-4111-8111-000000000002'::uuid, 'alumni@herzliah.test'),
  ('11111111-1111-4111-8111-000000000003'::uuid, 'pending@herzliah.test')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated', a.email,
  extensions.crypt('LocalDev-Passw0rd', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"locale":"en"}', now(), now(), '', '', '', ''
from accounts a
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
from auth.users u
where u.email like '%@herzliah.test'
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

insert into public.institution_memberships (institution_id, user_id, role, status)
select i.id, m.user_id, m.role::public.member_role, 'active'
from public.institutions i
cross join (values
  ('11111111-1111-4111-8111-000000000001'::uuid, 'super_admin'),
  ('11111111-1111-4111-8111-000000000002'::uuid, 'alumni')
) as m(user_id, role)
where i.slug = 'herzliah'
on conflict (institution_id, user_id) do nothing;

update public.alumni_profiles
set user_id = '11111111-1111-4111-8111-000000000002', claim_email = 'alumni@herzliah.test'
where id = '00000000-0000-4000-8000-000000000001';

-- 4. Edge-case records for access tests (supabase/tests) -------------------------------------------
-- An imported graduate who never claimed the record, and a claimed member who hid their profile.
insert into public.alumni_profiles (id, institution_id, first_name, last_name, grad_year, claim_email, is_directory_visible, privacy_preset, claimed_at)
select v.id, i.id, v.first_name, v.last_name, v.grad_year, v.claim_email, false, 'alumni_only', v.claimed_at
from public.institutions i
cross join (values
  ('22222222-2222-4222-8222-000000000001'::uuid, 'Imported', 'Unclaimed', 2010, 'unclaimed@herzliah.test', null::timestamptz),
  ('22222222-2222-4222-8222-000000000002'::uuid, 'Hidden', 'Member', 2005, null, now())
) as v(id, first_name, last_name, grad_year, claim_email, claimed_at)
where i.slug = 'herzliah'
on conflict (id) do nothing;

insert into public.alumni_experience (profile_id, institution_id, job_title, employer, is_current)
select '22222222-2222-4222-8222-000000000002', id, 'Private role', 'Private employer', true
from public.institutions where slug = 'herzliah'
  and not exists (select 1 from public.alumni_experience where profile_id = '22222222-2222-4222-8222-000000000002');

-- A visible demo profile with an email on record (used to test finding F3).
update public.alumni_profiles set claim_email = 'maya.frenkel@herzliah.test'
where id = '00000000-0000-4000-8000-000000000002';
