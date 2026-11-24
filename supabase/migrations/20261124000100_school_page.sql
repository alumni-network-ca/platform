-- School page (SCH-01, ADR 0022): the school's own links and contacts, shown to its signed-in alumni.
-- 1. school_pages holds one optional row per school. Every field is optional; an empty page is valid.
-- 2. Active members read their own school's row (the directory.use permission); nobody writes the table directly.
-- 3. set_school_page (settings.manage: school admins) replaces the whole page and writes an audit row.
-- 4. Links must be https with no credentials, enforced by constraints, so a direct call cannot store javascript:.

-- https only, a host with no user:password@, no spaces.
create function public.is_https_url(p_url text) returns boolean
language sql immutable as $$
  select p_url is null or (length(p_url) <= 500 and p_url ~ '^https://[^/@\s]+\.[^/@\s]+(/\S*)?$');
$$;

-- An object whose keys are known networks and whose values are https links.
create function public.is_social_links(p_links jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(p_links) = 'object'
    and not exists (
      select 1 from jsonb_each(p_links) e
      where e.key <> all (array['facebook', 'instagram', 'linkedin', 'youtube', 'x'])
         or jsonb_typeof(e.value) <> 'string'
         or not public.is_https_url(e.value #>> '{}'));
$$;

create table public.school_pages (
  institution_id uuid primary key references public.institutions (id) on delete cascade,
  website_url text check (public.is_https_url(website_url)),
  donate_url text check (public.is_https_url(donate_url)),
  social_links jsonb not null default '{}'::jsonb check (public.is_social_links(social_links)),
  about_en text check (length(about_en) <= 4000),
  about_fr text check (length(about_fr) <= 4000),
  address text check (length(address) <= 300),
  map_url text check (public.is_https_url(map_url)),
  office_name text check (length(office_name) <= 120),
  office_email text check (office_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(office_email) <= 254),
  office_phone text check (length(office_phone) <= 40),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.school_pages enable row level security;
create policy school_pages_read on public.school_pages for select to authenticated
  using (public.has_permission(institution_id, 'directory.use') or public.has_permission(institution_id, 'settings.manage')
         or public.is_system_admin());
grant select on public.school_pages to authenticated;

-- Replaces the page with p_page: a missing or blank field is cleared. Returns nothing; the app re-reads the row.
create function public.set_school_page(p_inst uuid, p_page jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_filled text[];
begin
  perform public.assert_permission(p_inst, 'settings.manage');
  if p_page is null or jsonb_typeof(p_page) <> 'object' then
    raise exception 'page must be an object' using errcode = '22023';
  end if;
  insert into public.school_pages (institution_id, website_url, donate_url, social_links, about_en, about_fr, address,
                                   map_url, office_name, office_email, office_phone, updated_by)
  values (
    p_inst,
    nullif(trim(p_page ->> 'website_url'), ''), nullif(trim(p_page ->> 'donate_url'), ''),
    coalesce(p_page -> 'social_links', '{}'::jsonb),
    nullif(trim(p_page ->> 'about_en'), ''), nullif(trim(p_page ->> 'about_fr'), ''),
    nullif(trim(p_page ->> 'address'), ''), nullif(trim(p_page ->> 'map_url'), ''),
    nullif(trim(p_page ->> 'office_name'), ''), nullif(lower(trim(p_page ->> 'office_email')), ''),
    nullif(trim(p_page ->> 'office_phone'), ''), auth.uid())
  on conflict (institution_id) do update set
    website_url = excluded.website_url, donate_url = excluded.donate_url, social_links = excluded.social_links,
    about_en = excluded.about_en, about_fr = excluded.about_fr, address = excluded.address,
    map_url = excluded.map_url, office_name = excluded.office_name, office_email = excluded.office_email,
    office_phone = excluded.office_phone, updated_at = now(), updated_by = excluded.updated_by;
  select array_agg(k order by k) into v_filled
  from jsonb_each_text(to_jsonb((select s from public.school_pages s where s.institution_id = p_inst))) e(k, v)
  where k not in ('institution_id', 'updated_at', 'updated_by') and v is not null and v not in ('', '{}');
  perform public.log_audit(p_inst, 'school.page_updated', 'institution', p_inst::text,
    jsonb_build_object('fields', coalesce(to_jsonb(v_filled), '[]'::jsonb)));
end $$;

revoke execute on function public.set_school_page(uuid, jsonb) from public, anon;
grant execute on function public.set_school_page(uuid, jsonb) to authenticated;
