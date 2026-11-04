-- Each school's browser-tab icon (favicon), kept in branding next to its logo. Files live in public/institutes/favicons/,
-- one per school, named by its slug. clean_branding accepts the new key under the logo's rules: a site path or an https
-- address. Both now refuse "//host/…", which starts with a slash but loads from another site. Unchanged otherwise.
-- CREATE OR REPLACE keeps the function's owner and its revoked execute grants.

create or replace function public.clean_branding(p_branding jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  v_out jsonb := '{}'::jsonb;
  v_short text := nullif(trim(p_branding ->> 'short_name'), '');
  v_key text;
  v_path text;
begin
  if p_branding is null or jsonb_typeof(p_branding) <> 'object' then
    return v_out;
  end if;
  if v_short is not null then
    if length(v_short) > 40 then
      raise exception 'the short name is 40 characters at most' using errcode = '22023';
    end if;
    v_out := v_out || jsonb_build_object('short_name', v_short);
  end if;
  foreach v_key in array array['logo', 'favicon'] loop
    v_path := nullif(trim(p_branding ->> v_key), '');
    if v_path is not null then
      if length(v_path) > 300
         or not ((v_path like '/%' and v_path not like '//%') or v_path like 'https://%') then
        raise exception 'the % must be a site path or an https address', v_key using errcode = '22023';
      end if;
      v_out := v_out || jsonb_build_object(v_key, v_path);
    end if;
  end loop;
  foreach v_key in array array['primary_color', 'accent_color'] loop
    if nullif(trim(p_branding ->> v_key), '') is not null then
      if trim(p_branding ->> v_key) !~ '^#[0-9A-Fa-f]{6}$' then
        raise exception '% must be a colour such as #0B2159', v_key using errcode = '22023';
      end if;
      v_out := v_out || jsonb_build_object(v_key, upper(trim(p_branding ->> v_key)));
    end if;
  end loop;
  return v_out;
end $$;
