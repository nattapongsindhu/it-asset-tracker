create extension if not exists pgcrypto;

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  building text null,
  floor text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_locations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_locations_updated_at on public.locations;

create trigger set_locations_updated_at
before update on public.locations
for each row
execute function public.set_locations_updated_at();

insert into public.locations (name, building, floor, notes)
values
  ('Pasadena Hub', 'Pasadena Hub', 'Receiving', 'Primary intake and dispatch location.'),
  ('Main Office', 'Main Office', 'Admin', 'Default office handoff point.'),
  ('Repair Bench', 'Main Office', 'Workshop', 'Temporary holding area for assets under repair.')
on conflict (name) do nothing;

alter table public.locations enable row level security;

drop policy if exists "Authenticated users can view locations" on public.locations;
create policy "Authenticated users can view locations"
on public.locations
for select
to authenticated
using (true);

grant select on public.locations to authenticated;
grant all on public.locations to service_role;

alter table public.assets
  add column if not exists location_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assets_location_id_fkey'
  ) then
    alter table public.assets
      add constraint assets_location_id_fkey
      foreign key (location_id) references public.locations(id) on delete set null;
  end if;
end
$$;

create index if not exists assets_location_id_idx
  on public.assets (location_id);

alter table public.asset_assignments
  add column if not exists asset_tag_snapshot text null;

update public.asset_assignments
set asset_tag_snapshot = assets.asset_tag
from public.assets
where public.asset_assignments.asset_id = assets.id
  and public.asset_assignments.asset_tag_snapshot is null;

alter table public.asset_assignments
  alter column asset_id drop not null;

drop index if exists asset_assignments_open_assignment_idx;

alter table public.asset_assignments
  drop constraint if exists asset_assignments_asset_id_fkey;

alter table public.asset_assignments
  add constraint asset_assignments_asset_id_fkey
  foreign key (asset_id) references public.assets(id) on delete set null;

create unique index if not exists asset_assignments_open_assignment_idx
  on public.asset_assignments (asset_id)
  where returned_at is null and asset_id is not null;

create or replace function public.assign_asset_to_user(
  p_asset_id uuid,
  p_user_id uuid,
  p_actor_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset record;
  v_new_assignment_id uuid;
  v_previous_assignment_id uuid;
  v_target_user_email text;
  v_previous_user_email text;
  v_action text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and role = 'ADMIN'
  ) then
    raise exception 'ACTOR_NOT_ADMIN';
  end if;

  select id, asset_tag, assigned_user_id, status
  into v_asset
  from public.assets
  where id = p_asset_id
  for update;

  if not found then
    raise exception 'ASSET_NOT_FOUND';
  end if;

  if v_asset.status in ('IN_REPAIR', 'RETIRED') then
    raise exception 'ASSET_NOT_ASSIGNABLE';
  end if;

  select email
  into v_target_user_email
  from public.profiles
  where id = p_user_id;

  if v_target_user_email is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_asset.assigned_user_id = p_user_id then
    return jsonb_build_object(
      'action', 'UNCHANGED',
      'asset_id', p_asset_id,
      'status', 'ASSIGNED',
      'user_id', p_user_id
    );
  end if;

  if v_asset.assigned_user_id is not null then
    select id
    into v_previous_assignment_id
    from public.asset_assignments
    where asset_id = p_asset_id
      and returned_at is null
    order by assigned_at desc
    limit 1
    for update;

    if v_previous_assignment_id is not null then
      update public.asset_assignments
      set returned_at = now(),
          returned_by = p_actor_id,
          status = 'RETURNED'
      where id = v_previous_assignment_id;
    end if;

    select email
    into v_previous_user_email
    from public.profiles
    where id = v_asset.assigned_user_id;
  end if;

  insert into public.asset_assignments (
    asset_id,
    asset_tag_snapshot,
    user_id,
    status,
    assigned_at,
    assigned_by,
    note
  ) values (
    p_asset_id,
    v_asset.asset_tag,
    p_user_id,
    'ASSIGNED',
    now(),
    p_actor_id,
    v_note
  )
  returning id into v_new_assignment_id;

  update public.assets
  set assigned_user_id = p_user_id,
      status = 'ASSIGNED',
      updated_at = now()
  where id = p_asset_id;

  v_action := case
    when v_asset.assigned_user_id is null then 'ASSET_ASSIGNED'
    else 'ASSET_REASSIGNED'
  end;

  insert into public.audit_logs (
    action,
    actor_id,
    entity_id,
    entity_type,
    detail
  ) values (
    v_action,
    p_actor_id,
    p_asset_id,
    'asset',
    case
      when v_action = 'ASSET_ASSIGNED' then jsonb_build_object(
        'asset_tag', v_asset.asset_tag,
        'assigned_to', coalesce(v_target_user_email, p_user_id::text),
        'assigned_to_id', p_user_id,
        'status', 'ASSIGNED',
        'note', v_note
      )
      else jsonb_build_object(
        'asset_tag', v_asset.asset_tag,
        'from_user', coalesce(v_previous_user_email, v_asset.assigned_user_id::text),
        'from_user_id', v_asset.assigned_user_id,
        'to_user', coalesce(v_target_user_email, p_user_id::text),
        'to_user_id', p_user_id,
        'previous_status', v_asset.status,
        'status', 'ASSIGNED',
        'note', v_note
      )
    end
  );

  return jsonb_build_object(
    'action', v_action,
    'assignment_id', v_new_assignment_id,
    'asset_id', p_asset_id,
    'status', 'ASSIGNED',
    'user_id', p_user_id,
    'previous_user_id', v_asset.assigned_user_id
  );
end;
$$;

create or replace function public.return_asset_to_stock(
  p_asset_id uuid,
  p_actor_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset record;
  v_open_assignment_id uuid;
  v_current_user_email text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and role = 'ADMIN'
  ) then
    raise exception 'ACTOR_NOT_ADMIN';
  end if;

  select id, asset_tag, assigned_user_id, status
  into v_asset
  from public.assets
  where id = p_asset_id
  for update;

  if not found then
    raise exception 'ASSET_NOT_FOUND';
  end if;

  if v_asset.assigned_user_id is null then
    return jsonb_build_object(
      'action', 'UNCHANGED',
      'asset_id', p_asset_id,
      'status', coalesce(v_asset.status, 'IN_STOCK')
    );
  end if;

  select id
  into v_open_assignment_id
  from public.asset_assignments
  where asset_id = p_asset_id
    and returned_at is null
  order by assigned_at desc
  limit 1
  for update;

  if v_open_assignment_id is not null then
    update public.asset_assignments
    set returned_at = now(),
        returned_by = p_actor_id,
        status = 'RETURNED'
    where id = v_open_assignment_id;
  end if;

  select email
  into v_current_user_email
  from public.profiles
  where id = v_asset.assigned_user_id;

  update public.assets
  set assigned_user_id = null,
      status = 'IN_STOCK',
      updated_at = now()
  where id = p_asset_id;

  insert into public.audit_logs (
    action,
    actor_id,
    entity_id,
    entity_type,
    detail
  ) values (
    'ASSET_UNASSIGNED',
    p_actor_id,
    p_asset_id,
    'asset',
    jsonb_build_object(
      'asset_tag', v_asset.asset_tag,
      'unassigned_from', coalesce(v_current_user_email, v_asset.assigned_user_id::text),
      'unassigned_from_id', v_asset.assigned_user_id,
      'previous_status', v_asset.status,
      'status', 'IN_STOCK',
      'note', v_note
    )
  );

  return jsonb_build_object(
    'action', 'ASSET_UNASSIGNED',
    'asset_id', p_asset_id,
    'status', 'IN_STOCK',
    'previous_user_id', v_asset.assigned_user_id
  );
end;
$$;

create or replace function public.move_asset_to_repair(
  p_asset_id uuid,
  p_actor_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset record;
  v_open_assignment_id uuid;
  v_current_user_email text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and role = 'ADMIN'
  ) then
    raise exception 'ACTOR_NOT_ADMIN';
  end if;

  select id, asset_tag, assigned_user_id, status
  into v_asset
  from public.assets
  where id = p_asset_id
  for update;

  if not found then
    raise exception 'ASSET_NOT_FOUND';
  end if;

  if v_asset.status = 'RETIRED' then
    raise exception 'ASSET_ALREADY_RETIRED';
  end if;

  if v_asset.status = 'IN_REPAIR' then
    return jsonb_build_object(
      'action', 'UNCHANGED',
      'asset_id', p_asset_id,
      'status', 'IN_REPAIR'
    );
  end if;

  if v_asset.assigned_user_id is not null then
    select id
    into v_open_assignment_id
    from public.asset_assignments
    where asset_id = p_asset_id
      and returned_at is null
    order by assigned_at desc
    limit 1
    for update;

    if v_open_assignment_id is not null then
      update public.asset_assignments
      set returned_at = now(),
          returned_by = p_actor_id,
          status = 'RETURNED'
      where id = v_open_assignment_id;
    end if;

    select email
    into v_current_user_email
    from public.profiles
    where id = v_asset.assigned_user_id;
  end if;

  update public.assets
  set assigned_user_id = null,
      status = 'IN_REPAIR',
      updated_at = now()
  where id = p_asset_id;

  insert into public.audit_logs (
    action,
    actor_id,
    entity_id,
    entity_type,
    detail
  ) values (
    'ASSET_SENT_TO_REPAIR',
    p_actor_id,
    p_asset_id,
    'asset',
    jsonb_build_object(
      'asset_tag', v_asset.asset_tag,
      'previous_status', v_asset.status,
      'status', 'IN_REPAIR',
      'previous_user', coalesce(v_current_user_email, v_asset.assigned_user_id::text),
      'previous_user_id', v_asset.assigned_user_id,
      'note', v_note
    )
  );

  return jsonb_build_object(
    'action', 'ASSET_SENT_TO_REPAIR',
    'asset_id', p_asset_id,
    'status', 'IN_REPAIR',
    'previous_user_id', v_asset.assigned_user_id
  );
end;
$$;

create or replace function public.complete_asset_repair(
  p_asset_id uuid,
  p_actor_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset record;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and role = 'ADMIN'
  ) then
    raise exception 'ACTOR_NOT_ADMIN';
  end if;

  select id, asset_tag, assigned_user_id, status
  into v_asset
  from public.assets
  where id = p_asset_id
  for update;

  if not found then
    raise exception 'ASSET_NOT_FOUND';
  end if;

  if v_asset.status = 'RETIRED' then
    raise exception 'ASSET_ALREADY_RETIRED';
  end if;

  if v_asset.status <> 'IN_REPAIR' then
    return jsonb_build_object(
      'action', 'UNCHANGED',
      'asset_id', p_asset_id,
      'status', coalesce(v_asset.status, 'IN_STOCK')
    );
  end if;

  update public.assets
  set status = 'IN_STOCK',
      updated_at = now()
  where id = p_asset_id;

  insert into public.audit_logs (
    action,
    actor_id,
    entity_id,
    entity_type,
    detail
  ) values (
    'ASSET_RETURNED_TO_STOCK',
    p_actor_id,
    p_asset_id,
    'asset',
    jsonb_build_object(
      'asset_tag', v_asset.asset_tag,
      'previous_status', v_asset.status,
      'status', 'IN_STOCK',
      'note', v_note
    )
  );

  return jsonb_build_object(
    'action', 'ASSET_RETURNED_TO_STOCK',
    'asset_id', p_asset_id,
    'status', 'IN_STOCK'
  );
end;
$$;

create or replace function public.decommission_asset(
  p_asset_id uuid,
  p_actor_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset record;
  v_open_assignment_id uuid;
  v_current_user_email text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and role = 'ADMIN'
  ) then
    raise exception 'ACTOR_NOT_ADMIN';
  end if;

  select id, asset_tag, assigned_user_id, status
  into v_asset
  from public.assets
  where id = p_asset_id
  for update;

  if not found then
    raise exception 'ASSET_NOT_FOUND';
  end if;

  if v_asset.status = 'RETIRED' then
    return jsonb_build_object(
      'action', 'UNCHANGED',
      'asset_id', p_asset_id,
      'status', 'RETIRED'
    );
  end if;

  if v_asset.assigned_user_id is not null then
    select id
    into v_open_assignment_id
    from public.asset_assignments
    where asset_id = p_asset_id
      and returned_at is null
    order by assigned_at desc
    limit 1
    for update;

    if v_open_assignment_id is not null then
      update public.asset_assignments
      set returned_at = now(),
          returned_by = p_actor_id,
          status = 'RETURNED'
      where id = v_open_assignment_id;
    end if;

    select email
    into v_current_user_email
    from public.profiles
    where id = v_asset.assigned_user_id;
  end if;

  update public.assets
  set assigned_user_id = null,
      status = 'RETIRED',
      updated_at = now()
  where id = p_asset_id;

  insert into public.audit_logs (
    action,
    actor_id,
    entity_id,
    entity_type,
    detail
  ) values (
    'ASSET_DECOMMISSIONED',
    p_actor_id,
    p_asset_id,
    'asset',
    jsonb_build_object(
      'asset_tag', v_asset.asset_tag,
      'previous_status', v_asset.status,
      'status', 'RETIRED',
      'previous_user', coalesce(v_current_user_email, v_asset.assigned_user_id::text),
      'previous_user_id', v_asset.assigned_user_id,
      'note', v_note
    )
  );

  return jsonb_build_object(
    'action', 'ASSET_DECOMMISSIONED',
    'asset_id', p_asset_id,
    'status', 'RETIRED'
  );
end;
$$;

grant execute on function public.assign_asset_to_user(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.return_asset_to_stock(uuid, uuid, text) to authenticated;
grant execute on function public.move_asset_to_repair(uuid, uuid, text) to authenticated;
grant execute on function public.complete_asset_repair(uuid, uuid, text) to authenticated;
grant execute on function public.decommission_asset(uuid, uuid, text) to authenticated;
grant execute on function public.assign_asset_to_user(uuid, uuid, uuid, text) to service_role;
grant execute on function public.return_asset_to_stock(uuid, uuid, text) to service_role;
grant execute on function public.move_asset_to_repair(uuid, uuid, text) to service_role;
grant execute on function public.complete_asset_repair(uuid, uuid, text) to service_role;
grant execute on function public.decommission_asset(uuid, uuid, text) to service_role;
