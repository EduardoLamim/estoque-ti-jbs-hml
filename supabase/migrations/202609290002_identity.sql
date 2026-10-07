create function private.protect_profile() returns trigger language plpgsql set search_path = '' as $$
begin
 if tg_op='DELETE' then raise exception 'HISTORICAL_IDENTITY'; end if;
 perform pg_advisory_xact_lock(71002);
 if tg_op='UPDATE' then
  if new.auth_user_id<>old.auth_user_id then raise exception 'IMMUTABLE_IDENTITY'; end if;
  if old.role in ('MONITORING','THIRD_PARTY') and (new.role<>old.role or new.username<>old.username) then raise exception 'IMMUTABLE_IDENTITY'; end if;
  if old.active and old.role='ADMIN' and (not new.active or new.role<>'ADMIN') and not exists(select 1 from public.profiles where active and role='ADMIN' and id<>old.id) then raise exception 'LAST_ADMIN'; end if;
  if old.active and not new.active then update private.app_sessions set revoked=true where profile_id=old.id; end if;
 end if;
 return new;
end $$;
create trigger profile_integrity before update or delete on public.profiles for each row execute function private.protect_profile();

create function public.save_profile(p_id uuid,p_auth_user_id uuid,p_version integer,p_data jsonb,p_operation uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid; result jsonb; previous public.profiles; saved private.operations; email text;
begin
 perform pg_advisory_xact_lock(71002);
 actor:=private.require_role(array['ADMIN']::public.app_role[]);
 if p_operation is null or jsonb_typeof(p_data)<>'object' or exists(select 1 from jsonb_object_keys(p_data) k where k not in ('username','display_name','role','active')) then raise exception 'INVALID_INPUT'; end if;
 select * into saved from private.operations where id=p_operation;
 if found then if saved.actor<>actor or saved.kind<>'profiles' then raise exception 'FORBIDDEN'; end if; return saved.result; end if;
 if p_data->>'role' not in ('ADMIN','STOCK_CONTROLLER','IT') then raise exception 'INVALID_INPUT'; end if;
 if p_id is null then
  select u.email into email from auth.users u where u.id=p_auth_user_id;
  if email is null then raise exception 'INVALID_INPUT'; end if;
  insert into public.profiles(auth_user_id,username,display_name,role,active,created_by,updated_by)
  values(p_auth_user_id,lower(trim(p_data->>'username')),trim(p_data->>'display_name'),(p_data->>'role')::public.app_role,coalesce((p_data->>'active')::boolean,true),actor,actor)
  returning to_jsonb(profiles) into result;
  insert into private.credentials(profile_id,technical_email) values((result->>'id')::uuid,email);
 else
  select * into previous from public.profiles where id=p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if previous.role in ('MONITORING','THIRD_PARTY') then raise exception 'FORBIDDEN'; end if;
  if previous.version is distinct from p_version then raise exception 'STALE_VERSION'; end if;
  p_data:=jsonb_set(jsonb_set(p_data,'{username}',to_jsonb(lower(trim(p_data->>'username')))),'{display_name}',to_jsonb(trim(p_data->>'display_name')));
  if to_jsonb(previous) @> p_data then result:=to_jsonb(previous);
  else
   update public.profiles set username=p_data->>'username',display_name=p_data->>'display_name',role=(p_data->>'role')::public.app_role,active=(p_data->>'active')::boolean,version=version+1,updated_at=now(),updated_by=actor where id=p_id returning to_jsonb(profiles) into result;
  end if;
 end if;
 insert into private.operations(id,actor,kind,result) values(p_operation,actor,'profiles',result);
 return result;
end $$;
create function private.require_admin_session(p_session uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid;
begin
 select p.id into actor from private.app_sessions s join public.profiles p on p.id=s.profile_id
 where s.session_id=p_session and not s.revoked and s.last_activity>now()-interval '10 minutes' and p.active and p.role='ADMIN';
 if actor is null then raise exception 'FORBIDDEN'; end if;
 return actor;
end $$;
create function public.regenerate_badge(p_id uuid,p_hash text,p_operation uuid,p_actor_session uuid) returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid;
begin
 perform pg_advisory_xact_lock(71002);
 actor:=private.require_admin_session(p_actor_session);
 if p_hash !~ '^[a-f0-9]{64}$' or p_operation is null then raise exception 'INVALID_INPUT'; end if;
 if exists(select 1 from private.operations where id=p_operation) then raise exception 'ALREADY_EXECUTED'; end if;
 if not exists(select 1 from public.profiles where id=p_id and active and role in ('ADMIN','STOCK_CONTROLLER','IT')) then raise exception 'NOT_FOUND'; end if;
 update private.credentials set badge_hash=p_hash where profile_id=p_id;
 if not found then raise exception 'NOT_FOUND'; end if;
 insert into public.audit_events(event_type,entity,entity_id,actor_id) values('badge_regenerated','profiles',p_id,actor);
 insert into private.operations values(p_operation,actor,'badge','{"completed":true}',now());
end $$;
create function public.get_exceptional_settings() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
 perform private.require_role(array['ADMIN']::public.app_role[]);
 return (select jsonb_build_object('monitoring_enabled',monitoring_enabled,'third_party_enabled',third_party_enabled,'version',version) from private.exceptional_settings);
end $$;
-- Hash is computed in the Edge Function. Function is service-only and checks actor session again.
create function public.configure_exceptional(p_actor_session uuid,p_monitoring boolean,p_third_party boolean,p_pin_hash text,p_version integer,p_operation uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid; before_value jsonb; after_value jsonb; e private.exceptional_settings; saved private.operations;
begin
 perform pg_advisory_xact_lock(71002);
 select p.id into actor from private.app_sessions s join public.profiles p on p.id=s.profile_id where s.session_id=p_actor_session and not s.revoked and s.last_activity>now()-interval '10 minutes' and p.active and p.role='ADMIN';
 if actor is null then raise exception 'FORBIDDEN'; end if;
 select * into saved from private.operations where id=p_operation;
 if found then if saved.actor<>actor or saved.kind<>'exceptional' then raise exception 'FORBIDDEN'; end if; return saved.result; end if;
 select * into e from private.exceptional_settings where singleton for update;
 if not found or e.version is distinct from p_version then raise exception 'STALE_VERSION'; end if;
 if p_monitoring is null or p_third_party is null or p_operation is null then raise exception 'INVALID_INPUT'; end if;
 before_value:=jsonb_build_object('monitoring_enabled',e.monitoring_enabled,'third_party_enabled',e.third_party_enabled);
 after_value:=jsonb_build_object('monitoring_enabled',p_monitoring,'third_party_enabled',p_third_party);
 if p_pin_hash is not null and p_pin_hash !~ '^pbkdf2:600000:[a-f0-9]{32}:[a-f0-9]{64}$' then raise exception 'INVALID_INPUT'; end if;
 if before_value<>after_value or p_pin_hash is not null then
  update private.exceptional_settings set monitoring_enabled=p_monitoring,third_party_enabled=p_third_party,pin_hash=coalesce(p_pin_hash,pin_hash),version=version+1 where singleton;
  if before_value<>after_value then insert into public.audit_events(event_type,entity,actor_id,old_data,new_data) values('exceptional_access_changed','exceptional_settings',actor,before_value,after_value); end if;
  if p_pin_hash is not null then insert into public.audit_events(event_type,entity,actor_id) values('exceptional_pin_changed','exceptional_settings',actor); end if;
  -- Disabling an identity also revokes existing sessions; re-enabling never revives them.
  update private.app_sessions set revoked=true where profile_id in (select id from public.profiles where (role='MONITORING' and not p_monitoring) or (role='THIRD_PARTY' and not p_third_party));
 end if;
 after_value:=after_value || jsonb_build_object('version',(select version from private.exceptional_settings));
 insert into private.operations values(p_operation,actor,'exceptional',after_value,now());
 return after_value;
end $$;
create function public.auth_rate_limit(p_bucket text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
 insert into private.rate_limits values(p_bucket,1,clock_timestamp()) on conflict(bucket) do update
 set hits=case when private.rate_limits.window_start<=clock_timestamp()-make_interval(secs=>p_seconds) then 1 else private.rate_limits.hits+1 end,
 window_start=case when private.rate_limits.window_start<=clock_timestamp()-make_interval(secs=>p_seconds) then clock_timestamp() else private.rate_limits.window_start end
 returning hits into n;
 return n<=p_limit;
end $$;
create function public.auth_candidate(p_kind text,p_value text) returns jsonb language sql security definer set search_path = '' as $$
 select jsonb_build_object('id',p.id,'auth_user_id',p.auth_user_id,'email',c.technical_email,'proof',case when p_kind='badge' then c.badge_hash when p_kind='exceptional' then e.pin_hash else null end)
 from public.profiles p join private.credentials c on c.profile_id=p.id left join private.exceptional_settings e on true
 where p.active and ((p_kind='password' and lower(p.username)=lower(p_value) and p.role in ('ADMIN','STOCK_CONTROLLER','IT'))
 or (p_kind='badge' and c.badge_hash=p_value and p.role in ('ADMIN','STOCK_CONTROLLER','IT'))
 or (p_kind='exceptional' and ((p_value='MONITORING' and p.role='MONITORING' and e.monitoring_enabled) or (p_value='THIRD_PARTY' and p.role='THIRD_PARTY' and e.third_party_enabled))))
$$;
create function public.register_session(p_profile uuid,p_session uuid,p_kind text,p_proof text) returns boolean language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
 perform pg_advisory_xact_lock(71002);
 select * into p from public.profiles where id=p_profile and active;
 if not found then return false; end if;
 if p_kind='badge' then
  if not exists(select 1 from private.credentials where profile_id=p_profile and badge_hash=p_proof) then return false; end if;
 elsif p_kind='exceptional' then
  if not exists(select 1 from private.exceptional_settings where pin_hash=p_proof and ((p.role='MONITORING' and monitoring_enabled) or (p.role='THIRD_PARTY' and third_party_enabled))) then return false; end if;
 elsif p_kind<>'password' or p.role not in ('ADMIN','STOCK_CONTROLLER','IT') then return false;
 end if;
 insert into private.app_sessions(session_id,profile_id) values(p_session,p_profile);
 return true;
end $$;
create function public.provisioned_auth_id(p_email text) returns uuid language sql security definer set search_path = '' as $$ select id from auth.users where email=p_email $$;
create function public.audit_password_reset(p_id uuid,p_operation uuid,p_stage text,p_actor_session uuid) returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid;
begin
 actor:=private.require_admin_session(p_actor_session);
 if p_stage not in ('requested','completed') then raise exception 'INVALID_INPUT'; end if;
 if not exists(select 1 from public.profiles where id=p_id and role in ('ADMIN','STOCK_CONTROLLER','IT')) then raise exception 'FORBIDDEN'; end if;
 insert into public.audit_events(event_type,entity,entity_id,actor_id,new_data) values('password_reset_'||p_stage,'profiles',p_id,actor,jsonb_build_object('operation_id',p_operation));
 if p_stage='completed' then update private.app_sessions set revoked=true where profile_id=p_id; end if;
end $$;
-- Bootstrap via local HML script only. No public signup, no client-controlled role metadata.
create function public.bootstrap_identity(p_auth_id uuid,p_username text,p_name text,p_role public.app_role) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; email text;
begin
 perform pg_advisory_xact_lock(71002);
 select id into result from public.profiles where auth_user_id=p_auth_id;
 if found then return result; end if;
 if p_role='ADMIN' and exists(select 1 from public.profiles where role='ADMIN') then raise exception 'BOOTSTRAP_COMPLETE'; end if;
 if p_role in ('MONITORING','THIRD_PARTY') and exists(select 1 from public.profiles where role=p_role) then raise exception 'BOOTSTRAP_COMPLETE'; end if;
 select u.email into email from auth.users u where id=p_auth_id;
 insert into public.profiles(auth_user_id,username,display_name,role) values(p_auth_id,p_username,p_name,p_role) returning id into result;
 insert into private.credentials values(result,email,null);
 return result;
end $$;
create function public.bootstrap_pin(p_hash text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if p_hash !~ '^pbkdf2:600000:[a-f0-9]{32}:[a-f0-9]{64}$' then raise exception 'INVALID_INPUT'; end if;
 insert into private.exceptional_settings(pin_hash) values(p_hash) on conflict do nothing;
end $$;
revoke execute on all functions in schema public from public,anon,authenticated;
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.current_profile(),private.session_id() to authenticated;
grant execute on function public.my_profile(),public.touch_session(),public.end_session(),public.save_master(text,uuid,integer,jsonb,uuid),public.operation_result(uuid),public.save_profile(uuid,uuid,integer,jsonb,uuid),public.get_exceptional_settings() to authenticated;
grant execute on function public.regenerate_badge(uuid,text,uuid,uuid),public.audit_password_reset(uuid,uuid,text,uuid),public.configure_exceptional(uuid,boolean,boolean,text,integer,uuid),public.auth_rate_limit(text,integer,integer),public.auth_candidate(text,text),public.register_session(uuid,uuid,text,text),public.provisioned_auth_id(text),public.bootstrap_identity(uuid,text,text,public.app_role),public.bootstrap_pin(text) to service_role;
