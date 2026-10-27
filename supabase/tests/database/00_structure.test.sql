-- Structural guards for the v2 schema (docs/architecture/data-model.md §1, §5, §6).
-- These catch a new table or function that forgets the access rules.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Every public table has RLS on.
select is(
  (select array_agg(tablename::text order by tablename) from pg_tables where schemaname = 'public' and not rowsecurity),
  null,
  'row level security is enabled on every public table'
);

-- No client can write to any table directly: anon has no privileges, authenticated has SELECT only.
select is(
  (select array_agg(distinct table_name::text order by table_name::text) from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'anon'),
  null,
  'anon has no privileges on any table'
);
select is(
  (select array_agg(distinct privilege_type::text) from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'authenticated'),
  array['SELECT'],
  'authenticated can only SELECT from tables'
);

-- No table has a write policy: every write goes through an RPC.
select is(
  (select array_agg(tablename || '.' || policyname) from pg_policies where schemaname = 'public' and cmd <> 'SELECT'),
  null,
  'no table has an insert, update or delete policy'
);

-- Every function sets its search_path, and every non-trigger function in public is security definer,
-- except search_directory, which runs under the caller's RLS on purpose.
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  null,
  'every public function pins its search_path'
);
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and not p.prosecdef and p.prorettype <> 'trigger'::regtype
     and p.proname not in ('search_directory', 'hash_token', 'validate_template_text')),
  null,
  'every public RPC is security definer'
);

-- anon can execute exactly two functions.
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')),
  array['confirm_still_accurate', 'public_school'],
  'anon can execute only public_school and confirm_still_accurate'
);

-- Internal helpers are not callable by clients.
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')
     and p.proname in ('log_audit', 'enqueue_email', 'mint_token', 'record_confirmation', 'hit_rate_limit',
                       'create_staff_invitation', 'assert_permission', 'resolve_email_template', 'assert_last_school_admin_kept')),
  null,
  'internal helpers are not executable by authenticated users'
);

-- The audit log is append-only.
insert into public.audit_log (actor_kind, action) values ('system', 'test.entry');
select throws_ok(
  $$ update public.audit_log set action = 'tampered' where action = 'test.entry' $$,
  '42501', null, 'audit_log rows cannot be updated'
);
select throws_ok(
  $$ delete from public.audit_log where action = 'test.entry' $$,
  '42501', null, 'recent audit_log rows cannot be deleted'
);

-- Reference data.
select is((select count(*)::int from public.role_permissions where role = 'alumni'), 1, 'alumni hold only directory.use');
select is(
  (select count(*)::int from public.email_templates where institution_id is null),
  16, 'platform defaults exist for 8 templates in EN and FR'
);

select * from finish();
rollback;
