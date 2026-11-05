-- École Maïmonide demo school on the LOCAL stack only, for presentation screenshots. Fictional people.
-- Accounts use the local seed password (supabase/seed.sql). Load once per database (it stops if the school exists;
-- deleting it fails because the audit log is append-only). Run with plain psql, not -1: part 2 opens its own
-- transactions to act as staff.
do $$ begin
  if exists (select 1 from public.institutions where slug = 'maimonide') then
    raise exception 'maimonide already loaded';
  end if;
end $$;

insert into public.institutions (id, name, slug, default_locale, reply_to_email, email_display_name, branding) values
  ('aaaaaaaa-0000-4000-8000-00000000d001', 'École Maïmonide', 'maimonide', 'fr', 'anciens@maimonide.test',
   'Réseau des anciens Maïmonide',
   '{"short_name": "Maïmonide", "logo": "/institutes/logos/maimonide.png",
     "favicon": "/institutes/favicons/maimonide.png", "primary_color": "#0D51A1", "accent_color": "#21BBED"}');

insert into public.email_templates (institution_id, key, locale, status, subject, body, approved_at)
select 'aaaaaaaa-0000-4000-8000-00000000d001', key, locale, 'approved', subject, body, now()
from public.email_templates where institution_id is null;

with accounts (id, email, name) as (values
  ('11111111-d001-4111-8111-000000000001'::uuid, 'admin@maimonide.test', 'Rachel Benhaim'),
  ('11111111-d001-4111-8111-000000000002'::uuid, 'reviewer@maimonide.test', 'David Assaraf'),
  ('11111111-d001-4111-8111-000000000003'::uuid, 'alumni@maimonide.test', 'Yaël Ohayon'),
  ('11111111-d001-4111-8111-000000000004'::uuid, 'pending@maimonide.test', 'Déborah Lévy'),
  ('11111111-d001-4111-8111-000000000005'::uuid, 'pending2@maimonide.test', 'Raphaël Elkaïm'),
  ('11111111-d001-4111-8111-000000000006'::uuid, 'pending3@maimonide.test', 'Noémie Sabbah'),
  ('11111111-d001-4111-8111-000000000007'::uuid, 'needsinfo@maimonide.test', 'Michaël Toledano'),
  ('11111111-d001-4111-8111-000000000008'::uuid, 'newmember@maimonide.test', 'Léa Bitton'),
  ('11111111-d001-4111-8111-000000000009'::uuid, 'nouveau@maimonide.test', 'Jonathan Azoulay'),
  ('11111111-d001-4111-8111-000000000010'::uuid, 'approved1@maimonide.test', 'Samuel Knafo'),
  ('11111111-d001-4111-8111-000000000011'::uuid, 'approved2@maimonide.test', 'Esther Dahan')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated', a.email,
  extensions.crypt('LocalDev-Passw0rd', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('locale', 'fr', 'person_name', a.name),
  now(), now(), '', '', '', ''
from accounts a;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
from auth.users u
where u.id::text like '11111111-d001-4111-8111-%';

insert into public.institution_memberships (institution_id, user_id, role, status, status_reason) values
  ('aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000001', 'school_admin', 'active', null),
  ('aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000002', 'reviewer', 'active', null),
  ('aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000003', 'alumni', 'active', null),
  ('aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000008', 'alumni', 'active', null);

insert into public.access_requests (id, institution_id, user_id, email, first_name, last_name, maiden_name, grad_year, note,
  status, info_request, decision_reason, decided_by, decided_at, created_at) values
  ('33333333-d001-4333-8333-000000000001', 'aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000004',
   'pending@maimonide.test', 'Déborah', 'Lévy', 'Abitbol', 2009,
   'J''étais en secondaire 5 en 2009. Je portais mon nom de jeune fille, Abitbol.',
   'pending', null, null, null, null, now() - interval '2 days'),
  ('33333333-d001-4333-8333-000000000002', 'aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000005',
   'pending2@maimonide.test', 'Raphaël', 'Elkaïm', null, 2016, null,
   'pending', null, null, null, null, now() - interval '1 day'),
  ('33333333-d001-4333-8333-000000000003', 'aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000006',
   'pending3@maimonide.test', 'Noémie', 'Sabbah', null, 2021, 'Ancienne présidente du conseil étudiant.',
   'pending', null, null, null, null, now() - interval '5 hours'),
  ('33333333-d001-4333-8333-000000000004', 'aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000007',
   'needsinfo@maimonide.test', 'Michaël', 'Toledano', null, 1998, null,
   'needs_info', 'Dans quelle classe étiez-vous en secondaire 5 ?', null, '11111111-d001-4111-8111-000000000002',
   now() - interval '3 days', now() - interval '4 days'),
  ('33333333-d001-4333-8333-000000000005', 'aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000003',
   'alumni@maimonide.test', 'Yaël', 'Ohayon', null, 2008, null,
   'approved', null, null, '11111111-d001-4111-8111-000000000002', now() - interval '20 days', now() - interval '21 days'),
  ('33333333-d001-4333-8333-000000000006', 'aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000008',
   'newmember@maimonide.test', 'Léa', 'Bitton', null, 2019, null,
   'approved', null, null, '11111111-d001-4111-8111-000000000002', now() - interval '1 day', now() - interval '2 days'),
  ('33333333-d001-4333-8333-000000000007', 'aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000010',
   'approved1@maimonide.test', 'Samuel', 'Knafo', null, 2004, null,
   'pending', null, null, null, null, now() - interval '6 days'),
  ('33333333-d001-4333-8333-000000000008', 'aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000011',
   'approved2@maimonide.test', 'Esther', 'Dahan', 'Cohen', 1995, null,
   'pending', null, null, null, null, now() - interval '7 days');

-- Demo alumni ---------------------------------------------------------------------------------------------

create temporary table demo (
  id uuid, first_name text, last_name text, grad_year int, field text, job_title text,
  employer text, city text, country text, university text, bio text, email text
);

insert into demo
select ('00000000-d001-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
  f.first, f.last, f.year, w.field[i.k], w.title[i.k], w.employer[i.k], c.city[i.m], c.country[i.m],
  u.university[1 + (g * 3) % array_length(u.university, 1)],
  'Promotion ' || f.year || ' de Maïmonide. ' || b.bio[1 + (g * 11) % array_length(b.bio, 1)],
  lower(translate(f.first || '.' || f.last, 'éèëêïîôàçÉ', 'eeeeiioacE')) || '.' || g || '@example.test'
from generate_series(1, 180) g
cross join (select
  array['medicine', 'law', 'technology', 'finance', 'entrepreneurship', 'dentistry',
    'architecture', 'technology', 'finance', 'psychology', 'engineering', 'consulting'] as field,
  array['Médecin de famille', 'Avocate en droit des affaires', 'Ingénieur logiciel', 'Gestionnaire de portefeuille',
    'Cofondateur et PDG', 'Orthodontiste', 'Architecte', 'Directrice de produit', 'CPA, associé',
    'Psychologue clinicienne', 'Ingénieur civil', 'Conseillère en stratégie'] as title,
  array['CHU Sainte-Justine', 'Lavery Avocats', 'Ubisoft Montréal', 'Banque Nationale', 'Fondateur, Studio Nord',
    'Clinique Dentaire Côte-Saint-Luc', 'Provencher_Roy', 'Lightspeed', 'Raymond Chabot Grant Thornton',
    'Pratique privée', 'WSP', 'Deloitte'] as employer) w
cross join (select
  array['Montréal', 'Montréal', 'Paris', 'Toronto', 'Tel Aviv', 'Montréal', 'New York', 'Jérusalem', 'Laval',
    'Montréal', 'Londres'] as city,
  array['Canada', 'Canada', 'France', 'Canada', 'Israël', 'Canada', 'États-Unis', 'Israël', 'Canada',
    'Canada', 'Royaume-Uni'] as country) c
cross join (select
  array['Université McGill', 'Université de Montréal', 'Université Concordia', 'HEC Montréal',
    'Polytechnique Montréal', 'Université Laval', 'Sciences Po Paris', 'Technion',
    'Université hébraïque de Jérusalem', 'Université de Sherbrooke'] as university) u
cross join (select
  array['Heureux d''aider les finissants qui hésitent sur leur orientation.',
    'Ouvert aux échanges avec les anciens qui s''installent à l''étranger.',
    'Toujours partant pour un café avec un ancien de l''école.',
    'J''accueille volontiers des stagiaires de Maïmonide.',
    'Je peux partager mon parcours avec les élèves de secondaire 5.'] as bio) b
cross join lateral (select 1 + (g * 5) % 12 as k, 1 + (g * 7) % 11 as m) i
cross join lateral (select
  (array['Yaël', 'Élie', 'Déborah', 'Raphaël', 'Sarah', 'David', 'Myriam', 'Jonathan', 'Léa', 'Benjamin',
    'Esther', 'Samuel', 'Rachel', 'Daniel', 'Noémie', 'Nathan', 'Judith', 'Mickaël', 'Laura', 'Ariel',
    'Rébecca', 'Yoni', 'Shirel', 'Ilan', 'Mélanie', 'Jérémie', 'Orly', 'Gabriel', 'Chloé', 'Michaël',
    'Anaïs', 'Simon', 'Tamar', 'Lior', 'Dina', 'Kevin', 'Audrey', 'Steven', 'Sharon', 'Eden'])[1 + (g * 7) % 40] as first,
  (array['Ohayon', 'Azoulay', 'Benchetrit', 'Elbaz', 'Amsellem', 'Abitbol', 'Bensoussan', 'Assouline', 'Cohen',
    'Toledano', 'Dahan', 'Knafo', 'Malka', 'Sebag', 'Hazan', 'Lévy', 'Ifergan', 'Ouaknine', 'Edery', 'Bitton',
    'Lasry', 'Zagury', 'Amar', 'Bouhadana', 'Attias', 'Serfaty', 'Sabbah', 'Benhamou', 'Moyal', 'Suissa', 'Guedj',
    'Peretz', 'Abécassis', 'Elmaleh', 'Benaïm', 'Chétrit', 'Ohana', 'Kadoch', 'Uzan', 'Marciano', 'Bénichou'])[1 + (g * 13) % 41]
    as last,
  1975 + (g * 17) % 51 as year) f;

-- The signed-in alumna is profile 1: Yaël Ohayon, class of 2008.
update demo set first_name = 'Yaël', last_name = 'Ohayon', grad_year = 2008, field = 'law',
  job_title = 'Avocate en droit des affaires', employer = 'Lavery Avocats', city = 'Montréal', country = 'Canada',
  university = 'Université McGill',
  bio = 'Promotion 2008 de Maïmonide. Avocate en droit des affaires à Montréal, j''aime conseiller les anciens qui se lancent en droit.'
where id = '00000000-d001-4000-8000-000000000001';
update demo set first_name = 'Élie', last_name = 'Azoulay', grad_year = 1999, field = 'medicine',
  job_title = 'Cardiologue', employer = 'Hôpital général juif', city = 'Montréal', country = 'Canada',
  university = 'Université de Montréal',
  bio = 'Promotion 1999 de Maïmonide. Cardiologue à l''Hôpital général juif. J''offre du mentorat aux anciens qui visent la médecine et j''accueille des élèves pour une journée d''observation.'
where id = '00000000-d001-4000-8000-000000000002';

insert into public.alumni_profiles (id, institution_id, status, visibility, first_name, last_name, grad_year, city, country,
  bio, job_title, employer, career_field_id, languages, onboarding_step, onboarding_completed_at, published_at,
  last_confirmed_at, confirmation_due_at)
select d.id, 'aaaaaaaa-0000-4000-8000-00000000d001', 'active', 'members', d.first_name, d.last_name, d.grad_year, d.city,
  d.country, d.bio, d.job_title, d.employer, cf.id, array['fr', 'en'], 7, now(), now() - (d.grad_year % 40) * interval '1 day',
  now(), now() + interval '12 months'
from demo d
left join public.career_fields cf on cf.institution_id is null and cf.key = d.field;

insert into public.alumni_private (profile_id, institution_id)
select id, institution_id from public.alumni_profiles where id::text like '00000000-d001-4000-8000-%';

insert into public.alumni_education (profile_id, institution_id, school, sort_order)
select d.id, 'aaaaaaaa-0000-4000-8000-00000000d001', d.university, 1 from demo d;

insert into public.alumni_experience (profile_id, institution_id, job_title, employer, career_field_id, location, is_current, sort_order)
select p.id, p.institution_id, p.job_title, p.employer, p.career_field_id, p.city, true, 1
from public.alumni_profiles p where p.id::text like '00000000-d001-4000-8000-%';

insert into public.profile_contact_channels (profile_id, institution_id, type, value, is_public, sort_order)
select d.id, 'aaaaaaaa-0000-4000-8000-00000000d001'::uuid, 'linkedin'::public.channel_type,
  'https://www.linkedin.com/in/' || lower(translate(d.first_name || '-' || d.last_name, 'éèëêïîôàçÉ', 'eeeeiioacE')), true, 1
from demo d
union all
select d.id, 'aaaaaaaa-0000-4000-8000-00000000d001'::uuid, 'email'::public.channel_type, d.email, true, 2
from demo d;

insert into public.profile_offers (profile_id, offer_type_id, institution_id)
select d.id, o.id, 'aaaaaaaa-0000-4000-8000-00000000d001'
from demo d
cross join lateral (select substring(d.id::text from 25)::int as g) n
cross join lateral (values
  ('mentoring', n.g % 3 = 0 or n.g <= 2), ('career_advice', n.g % 2 = 0 or n.g = 1), ('job_opportunities', n.g % 5 = 0),
  ('offering_jobs', n.g % 7 = 0), ('offering_internships', n.g % 6 = 1), ('shadowing', n.g % 8 = 3 or n.g = 2),
  ('speaking', n.g % 9 = 4), ('networking', n.g % 4 = 1), ('entrepreneurship', n.g % 10 = 5)
) as v(key, enabled)
join public.offer_types o on o.institution_id is null and o.key = v.key
where v.enabled;

update public.alumni_profiles set user_id = '11111111-d001-4111-8111-000000000003'
where id = '00000000-d001-4000-8000-000000000001';
update public.access_requests set profile_id = '00000000-d001-4000-8000-000000000001'
where id = '33333333-d001-4333-8333-000000000005';

insert into public.consents (institution_id, user_id, document, version) values
  ('aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000003', 'terms', '2026-10'),
  ('aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000003', 'privacy_policy', '2026-10'),
  ('aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000003', 'directory_publication', '2026-10');

-- Léa Bitton: approved yesterday, has not finished onboarding (hidden until she publishes).
insert into public.alumni_profiles (id, institution_id, user_id, status, visibility, first_name, last_name, grad_year,
  onboarding_completed_at, published_at, last_confirmed_at)
values ('22222222-d001-4222-8222-000000000005', 'aaaaaaaa-0000-4000-8000-00000000d001',
  '11111111-d001-4111-8111-000000000008', 'active', 'hidden', 'Léa', 'Bitton', 2019, null, null, now());
insert into public.alumni_private (profile_id, institution_id) values
  ('22222222-d001-4222-8222-000000000005', 'aaaaaaaa-0000-4000-8000-00000000d001');
update public.access_requests set profile_id = '22222222-d001-4222-8222-000000000005'
where id = '33333333-d001-4333-8333-000000000006';

-- An unclaimed class-list record under Déborah's maiden name, suggested to staff for her pending sign-up.
insert into public.alumni_profiles (id, institution_id, first_name, last_name, grad_year)
values ('22222222-d001-4222-8222-000000000099', 'aaaaaaaa-0000-4000-8000-00000000d001', 'Déborah', 'Abitbol', 2009);

drop table demo;

-- Part 2, applied after the load above. -----------------------------------------------------------------------

-- Léa Bitton's onboarding, prefilled up to the last step.
update public.alumni_profiles set onboarding_step = 6, city = 'Montréal', country = 'Canada',
  job_title = 'Résidente en pédiatrie', employer = 'CHU Sainte-Justine',
  career_field_id = (select id from public.career_fields where institution_id is null and key = 'medicine'),
  bio = 'Promotion 2019 de Maïmonide. Résidente en pédiatrie, heureuse d''échanger avec les élèves qui pensent à la médecine.',
  languages = array['fr','en','he']
where id = '22222222-d001-4222-8222-000000000005';
insert into public.alumni_education (profile_id, institution_id, school, sort_order)
values ('22222222-d001-4222-8222-000000000005', 'aaaaaaaa-0000-4000-8000-00000000d001', 'Université McGill', 1);
insert into public.alumni_experience (profile_id, institution_id, job_title, employer, career_field_id, location, is_current, sort_order)
select id, institution_id, job_title, employer, career_field_id, city, true, 1 from public.alumni_profiles
where id = '22222222-d001-4222-8222-000000000005';
insert into public.profile_offers (profile_id, offer_type_id, institution_id)
select '22222222-d001-4222-8222-000000000005', o.id, 'aaaaaaaa-0000-4000-8000-00000000d001'
from public.offer_types o where o.institution_id is null and o.key in ('mentoring', 'shadowing', 'career_advice');

-- Spread the class years over 1975-2025 and match French job titles to first names.
create temporary table regen as
select p.id, n.g,
  case when n.g % 2 = 0
    then (array['Déborah','Sarah','Myriam','Léa','Esther','Rachel','Noémie','Judith','Laura','Rébecca','Shirel','Mélanie',
      'Orly','Chloé','Anaïs','Tamar','Dina','Audrey','Sharon','Yaël'])[1 + (n.g * 7) % 20]
    else (array['Élie','Raphaël','David','Jonathan','Benjamin','Samuel','Daniel','Nathan','Mickaël','Ariel','Yoni','Ilan',
      'Jérémie','Gabriel','Michaël','Simon','Lior','Kevin','Steven','Eden'])[1 + (n.g * 7) % 20] end as first,
  n.g % 2 = 0 as female, 1975 + (n.g * 19) % 51 as year, 1 + (n.g * 5) % 12 as k
from public.alumni_profiles p
cross join lateral (select substring(p.id::text from 25)::int as g) n
where p.id::text like '00000000-d001-4000-8000-%' and n.g > 2;

update public.alumni_profiles a set
  first_name = r.first, grad_year = r.year,
  job_title = case when r.female
    then (array['Médecin de famille','Avocate en droit des affaires','Ingénieure logiciel','Gestionnaire de portefeuille',
      'Cofondatrice et PDG','Orthodontiste','Architecte','Directrice de produit','CPA, associée',
      'Psychologue clinicienne','Ingénieure civile','Conseillère en stratégie'])[r.k]
    else (array['Médecin de famille','Avocat en droit des affaires','Ingénieur logiciel','Gestionnaire de portefeuille',
      'Cofondateur et PDG','Orthodontiste','Architecte','Directeur de produit','CPA, associé',
      'Psychologue clinicien','Ingénieur civil','Conseiller en stratégie'])[r.k] end,
  employer = (array['CHU Sainte-Justine','Lavery Avocats','Ubisoft Montréal','Banque Nationale','Studio Nord',
      'Clinique Dentaire Côte-Saint-Luc','Provencher_Roy','Lightspeed','Raymond Chabot Grant Thornton',
      'Pratique privée','WSP','Deloitte'])[r.k],
  bio = 'Promotion ' || r.year || ' de Maïmonide. ' ||
    (array['J''aide volontiers les finissants qui hésitent sur leur orientation.',
      'Je réponds avec plaisir aux anciens qui s''installent à l''étranger.',
      'Un café avec un ancien de l''école ? Avec plaisir.',
      'J''accueille volontiers des stagiaires de Maïmonide.',
      'Je peux partager mon parcours avec les élèves de secondaire 5.'])[1 + (r.g * 11) % 5],
  published_at = now() - (r.g % 37) * interval '1 day' - (r.g % 5) * interval '1 hour'
from regen r where a.id = r.id;

update public.alumni_experience e set job_title = a.job_title, employer = a.employer
from public.alumni_profiles a where e.profile_id = a.id and a.id in (select id from regen);

-- Contact channels follow the final names (profiles 1 and 2 keep a plain first.last address).
update public.profile_contact_channels c set value = case c.type
    when 'linkedin' then 'https://www.linkedin.com/in/' || lower(translate(a.first_name || '-' || a.last_name, 'éèëêïîôàçÉ', 'eeeeiioacE'))
    else lower(translate(a.first_name || '.' || a.last_name, 'éèëêïîôàçÉ', 'eeeeiioacE'))
      || case when substring(a.id::text from 25)::int <= 2 then '' else '.' || substring(a.id::text from 25)::int end
      || '@example.test' end
from public.alumni_profiles a where c.profile_id = a.id and a.id::text like '00000000-d001-4000-8000-%';

-- Staff activity for the dashboard and the audit log, through the real functions.
with accounts (id, email, name) as (values
  ('11111111-d001-4111-8111-000000000012'::uuid, 'ilan@maimonide.test', 'Ilan Bouhadana'),
  ('11111111-d001-4111-8111-000000000013'::uuid, 'chloe@maimonide.test', 'Chloé Serfaty'),
  ('11111111-d001-4111-8111-000000000014'::uuid, 'kevin@maimonide.test', 'Kevin Attias'))
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated', a.email,
  extensions.crypt('LocalDev-Passw0rd', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('locale', 'fr', 'person_name', a.name), now(), now(), '', '', '', ''
from accounts a;
insert into public.access_requests (id, institution_id, user_id, email, first_name, last_name, maiden_name, grad_year, note, status, created_at) values
  ('33333333-d001-4333-8333-000000000012', 'aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000012',
   'ilan@maimonide.test', 'Ilan', 'Bouhadana', null, 2012, null, 'pending', now() - interval '3 days'),
  ('33333333-d001-4333-8333-000000000013', 'aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000013',
   'chloe@maimonide.test', 'Chloé', 'Serfaty', 'Amar', 2003, null, 'pending', now() - interval '3 days'),
  ('33333333-d001-4333-8333-000000000014', 'aaaaaaaa-0000-4000-8000-00000000d001', '11111111-d001-4111-8111-000000000014',
   'kevin@maimonide.test', 'Kevin', 'Attias', null, 1987, null, 'pending', now() - interval '2 days');

begin; -- the reviewer approves Samuel and Esther
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-d001-4111-8111-000000000002","role":"authenticated","aal":"aal2"}', true);
select public.decide_access_request('33333333-d001-4333-8333-000000000007', 'approve', null, null);
select public.decide_access_request('33333333-d001-4333-8333-000000000008', 'approve', null, null);
commit;

begin; -- the admin approves Ilan and Chloé, and invites a reviewer
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-d001-4111-8111-000000000001","role":"authenticated","aal":"aal2"}', true);
select public.decide_access_request('33333333-d001-4333-8333-000000000012', 'approve', null, null);
select public.decide_access_request('33333333-d001-4333-8333-000000000013', 'approve', null, null);
select public.invite_staff('aaaaaaaa-0000-4000-8000-00000000d001', 'secretariat@maimonide.test', 'reviewer');
commit;

begin; -- the reviewer asks Kevin for more information
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-d001-4111-8111-000000000002","role":"authenticated","aal":"aal2"}', true);
select public.decide_access_request('33333333-d001-4333-8333-000000000014', 'needs_info',
  'Pouvez-vous confirmer votre année de finissant ? Nos dossiers indiquent 1988.', null);
commit;
