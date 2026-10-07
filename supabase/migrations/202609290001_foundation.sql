-- Phase 01 only. Private schema is not exposed through the Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create type public.app_role as enum ('ADMIN','STOCK_CONTROLLER','IT','MONITORING','THIRD_PARTY');
create table public.profiles (
 id uuid primary key default gen_random_uuid(), auth_user_id uuid not null unique references auth.users(id),
 username text not null check (username ~ '^[a-zA-Z0-9._-]{3,64}$'), display_name text not null check(length(trim(display_name)) between 1 and 120),
 role public.app_role not null, active boolean not null default true, version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id)
);
create unique index profiles_username_key on public.profiles(lower(username));
create table private.credentials (
 profile_id uuid primary key references public.profiles(id), technical_email text not null unique,
 badge_hash text unique check(badge_hash is null or badge_hash ~ '^[a-f0-9]{64}$')
);
create table private.exceptional_settings (
 singleton boolean primary key default true check(singleton), pin_hash text not null,
 monitoring_enabled boolean not null default true, third_party_enabled boolean not null default true,
 version integer not null default 1
);
create table private.app_sessions (
 session_id uuid primary key, profile_id uuid not null references public.profiles(id),
 last_activity timestamptz not null default now(), revoked boolean not null default false
);
create index on private.app_sessions(profile_id);
create table private.rate_limits (bucket text primary key, hits integer not null, window_start timestamptz not null);
create table private.operations (
 id uuid primary key, actor uuid not null references public.profiles(id), kind text not null, result jsonb not null,
 created_at timestamptz not null default now()
);
create sequence public.position_code_seq maxvalue 99999 no cycle;
create table public.stock_positions (
 id uuid primary key default gen_random_uuid(), code text not null unique default ('POS-' || lpad(nextval('public.position_code_seq')::text,5,'0')),
 name text not null check(length(trim(name)) between 1 and 120), parent_id uuid references public.stock_positions(id),
 active boolean not null default true, version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(parent_id is distinct from id)
);
create index on public.stock_positions(parent_id);
create index on public.stock_positions(lower(name));
create table public.categories (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120), active boolean not null default true,
 preferred_position_id uuid references public.stock_positions(id), triage_position_id uuid references public.stock_positions(id),
 triage_on_create boolean not null default false, triage_on_return boolean not null default false,
 require_hostname boolean not null default false, notes text not null default '' check(length(notes)<=4000),
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(not(triage_on_create or triage_on_return) or triage_position_id is not null)
);
create index on public.categories(preferred_position_id);
create index on public.categories(triage_position_id);
create table public.manufacturers (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120), active boolean not null default true,
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index manufacturers_name_key on public.manufacturers(lower(trim(name)));
-- Supports numeric and Receita Federal alphanumeric CNPJ; digits remain the final two characters.
create function private.valid_cnpj(value text) returns boolean language plpgsql immutable set search_path = '' as $$
declare s integer; d integer; i integer; j integer; w integer[];
begin
 if value !~ '^[A-Z0-9]{12}[0-9]{2}$' or value ~ '^(.)\1{13}$' then return false; end if;
 for j in 1..2 loop
  w := case when j=1 then array[5,4,3,2,9,8,7,6,5,4,3,2] else array[6,5,4,3,2,9,8,7,6,5,4,3,2] end;
  s := 0;
  for i in 1..(11+j) loop s := s + (ascii(substr(value,i,1))-48)*w[i]; end loop;
  d := s%11; d := case when d<2 then 0 else 11-d end;
  if d <> substr(value,12+j,1)::integer then return false; end if;
 end loop;
 return true;
end $$;
create table public.suppliers (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120),
 cnpj text not null unique check(private.valid_cnpj(cnpj)), address text not null check(length(trim(address)) between 1 and 500),
 notes text not null default '' check(length(notes)<=4000), active boolean not null default true,
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.locations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120),
 notes text not null default '' check(length(notes)<=4000), active boolean not null default true,
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.audit_events (
 id bigint generated always as identity primary key, event_type text not null, entity text not null, entity_id uuid,
 actor_id uuid references public.profiles(id), occurred_at timestamptz not null default now(), old_data jsonb, new_data jsonb
);
create index on public.audit_events(entity,entity_id,occurred_at desc);
create function private.session_id() returns uuid language sql stable set search_path = '' as $$
 select nullif(auth.jwt()->>'session_id','')::uuid
$$;
create function private.current_profile() returns public.profiles language sql stable security definer set search_path = '' as $$
 select p from public.profiles p join private.app_sessions s on s.profile_id=p.id
 where p.auth_user_id=auth.uid() and p.active and s.session_id=private.session_id()
 and not s.revoked and s.last_activity > now()-interval '10 minutes'
 and (p.role not in ('MONITORING','THIRD_PARTY') or exists (
  select 1 from private.exceptional_settings e where case p.role when 'MONITORING' then e.monitoring_enabled else e.third_party_enabled end))
$$;
create function private.require_role(allowed public.app_role[]) returns uuid language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin p := private.current_profile(); if p.id is null then raise exception 'SESSION_EXPIRED'; end if;
 if not(p.role=any(allowed)) then raise exception 'FORBIDDEN'; end if; return p.id; end $$;
create function public.my_profile() returns jsonb language sql security definer set search_path = '' as $$ select to_jsonb(private.current_profile()) $$;
create function public.touch_session() returns void language plpgsql security definer set search_path = '' as $$
begin
 perform private.require_role(enum_range(null::public.app_role));
 update private.app_sessions set last_activity=now() where session_id=private.session_id() and not revoked;
end $$;
create function public.end_session() returns void language sql security definer set search_path = '' as $$
 update private.app_sessions set revoked=true where session_id=private.session_id() and profile_id in (select id from public.profiles where auth_user_id=auth.uid())
$$;
create function private.audit_row() returns trigger language plpgsql security definer set search_path = '' as $$
declare old_value jsonb; new_value jsonb; actor uuid;
begin
 new_value := to_jsonb(new)-array['created_at','updated_at','version','created_by','updated_by'];
 if tg_op='UPDATE' then old_value:=to_jsonb(old)-array['created_at','updated_at','version','created_by','updated_by']; end if;
 if new_value is not distinct from old_value then return new; end if;
 select id into actor from public.profiles where auth_user_id=auth.uid();
 insert into public.audit_events(event_type,entity,entity_id,actor_id,old_data,new_data)
 values(case when tg_op='INSERT' then 'created' when old_value->>'active' is distinct from new_value->>'active' then 'status_changed' when old_value->>'role' is distinct from new_value->>'role' then 'role_changed' else 'updated' end,
 tg_table_name,new.id,actor,old_value,new_value);
 return new;
end $$;
create function private.immutable_audit() returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'IMMUTABLE_AUDIT'; end $$;
create trigger audit_immutable before update or delete on public.audit_events for each row execute function private.immutable_audit();
create function private.validate_master() returns trigger language plpgsql set search_path = '' as $$
begin
 if tg_table_name='stock_positions' then
  if tg_op='UPDATE' and new.code<>old.code then raise exception 'IMMUTABLE_CODE'; end if;
  if new.parent_id is not null then
   if not exists(select 1 from public.stock_positions where id=new.parent_id and (active or not new.active)) then raise exception 'INVALID_PARENT'; end if;
   if exists(with recursive ancestors as (select id,parent_id from public.stock_positions where id=new.parent_id union all select p.id,p.parent_id from public.stock_positions p join ancestors a on p.id=a.parent_id) select 1 from ancestors where id=new.id) then raise exception 'POSITION_CYCLE'; end if;
  end if;
  if not new.active and (exists(select 1 from public.categories where preferred_position_id=new.id or triage_position_id=new.id) or exists(select 1 from public.stock_positions where parent_id=new.id and active)) then raise exception 'POSITION_REFERENCED'; end if;
 elsif tg_table_name='categories' then
  if (new.triage_on_create or new.triage_on_return) and new.triage_position_id is null then raise exception 'TRIAGE_REQUIRED'; end if;
  if exists(select 1 from public.stock_positions where id in (new.preferred_position_id,new.triage_position_id) and not active) then raise exception 'POSITION_INACTIVE'; end if;
 end if;
 return new;
end $$;
create trigger validate_position before insert or update on public.stock_positions for each row execute function private.validate_master();
create trigger validate_category before insert or update on public.categories for each row execute function private.validate_master();
do $$ declare t text; begin
 foreach t in array array['profiles','categories','manufacturers','suppliers','locations','stock_positions'] loop
  execute format('create trigger audit_changes after insert or update on public.%I for each row execute function private.audit_row()',t);
 end loop;
 foreach t in array array['profiles','categories','manufacturers','suppliers','locations','stock_positions','audit_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
 foreach t in array array['credentials','exceptional_settings','app_sessions','rate_limits','operations'] loop
  execute format('alter table private.%I enable row level security',t);
 end loop;
 foreach t in array array['categories','manufacturers','suppliers','locations','stock_positions'] loop
  execute format('create policy read_staff on public.%I for select to authenticated using ((select (private.current_profile()).role) in (''ADMIN'',''STOCK_CONTROLLER'',''IT''))',t);
 end loop;
end $$;
create policy read_profile on public.profiles for select to authenticated using ((select (private.current_profile()).role)='ADMIN' or id=(select (private.current_profile()).id));
create policy read_audit on public.audit_events for select to authenticated using ((select (private.current_profile()).role) in ('ADMIN','STOCK_CONTROLLER'));
-- Policy helpers are executable, but private relations remain inaccessible.
grant usage on schema private to authenticated;
grant execute on function private.current_profile(), private.session_id() to authenticated;

create function public.save_master(p_entity text, p_id uuid, p_version integer, p_data jsonb, p_operation uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid; previous jsonb; result jsonb; stored private.operations; allowed text[]; columns_sql text; values_sql text; update_sql text;
begin
 perform pg_advisory_xact_lock(71001);
 actor:=private.require_role(array['ADMIN','STOCK_CONTROLLER']::public.app_role[]);
 if p_operation is null then raise exception 'INVALID_INPUT'; end if;
 select * into stored from private.operations where id=p_operation;
 if found then if stored.actor<>actor or stored.kind<>p_entity then raise exception 'FORBIDDEN'; end if; return stored.result; end if;
 allowed:=case p_entity
 when 'categories' then array['name','active','preferred_position_id','triage_position_id','triage_on_create','triage_on_return','require_hostname','notes']
 when 'manufacturers' then array['name','active'] when 'suppliers' then array['name','cnpj','address','notes','active']
 when 'locations' then array['name','notes','active'] when 'stock_positions' then array['name','parent_id','active'] else null end;
 if allowed is null or jsonb_typeof(p_data)<>'object' or exists(select 1 from jsonb_object_keys(p_data) k where not(k=any(allowed))) then raise exception 'INVALID_INPUT'; end if;
 if p_data ? 'name' then p_data:=jsonb_set(p_data,'{name}',to_jsonb(trim(p_data->>'name'))); end if;
 if p_entity='suppliers' and p_data ? 'cnpj' then p_data:=jsonb_set(p_data,'{cnpj}',to_jsonb(upper(regexp_replace(p_data->>'cnpj','[^a-zA-Z0-9]','','g')))); end if;
 if p_id is not null then
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',p_entity) into previous using p_id;
  if previous is null then raise exception 'NOT_FOUND'; end if;
  if p_version is distinct from (previous->>'version')::integer then raise exception 'STALE_VERSION'; end if;
  if previous @> p_data then result:=previous;
  else
   select string_agg(format('%I = r.%I',key,key),',') into update_sql from jsonb_object_keys(p_data) key;
   execute format('update public.%1$I t set %2$s, version=t.version+1,updated_at=now() from jsonb_populate_record(null::public.%1$I,$1) r where t.id=$2 returning to_jsonb(t)',p_entity,update_sql) into result using p_data,p_id;
  end if;
 else
  select string_agg(format('%I',key),','),string_agg(format('r.%I',key),',') into columns_sql,values_sql from jsonb_object_keys(p_data) key;
  if columns_sql is null then raise exception 'INVALID_INPUT'; end if;
  execute format('insert into public.%1$I (%2$s) select %3$s from jsonb_populate_record(null::public.%1$I,$1) r returning to_jsonb(%1$I)',p_entity,columns_sql,values_sql) into result using p_data;
 end if;
 insert into private.operations(id,actor,kind,result) values(p_operation,actor,p_entity,result);
 return result;
end $$;
create function public.operation_result(p_operation uuid) returns jsonb language sql security definer set search_path = '' as $$
 select result from private.operations where id=p_operation and actor=(private.current_profile()).id
$$;
-- All privileges are explicit; new functions must also be revoked in their migration.
revoke execute on all functions in schema public from public,anon,authenticated;
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.current_profile(),private.session_id() to authenticated;
grant execute on function public.my_profile(),public.touch_session(),public.end_session(),public.save_master(text,uuid,integer,jsonb,uuid),public.operation_result(uuid) to authenticated;
revoke all on all sequences in schema public from anon,authenticated;
