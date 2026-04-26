create table if not exists public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid null references public.assets(id) on delete set null,
  asset_tag_snapshot text null,
  action_taken text not null,
  technician_name text null,
  cost numeric(12, 2) null check (cost is null or cost >= 0),
  notes text null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists maintenance_logs_asset_id_idx
  on public.maintenance_logs (asset_id, created_at desc);

alter table public.maintenance_logs enable row level security;

drop policy if exists "Authenticated users can view maintenance logs" on public.maintenance_logs;
create policy "Authenticated users can view maintenance logs"
on public.maintenance_logs
for select
to authenticated
using (true);

drop policy if exists "Admins can insert maintenance logs" on public.maintenance_logs;
create policy "Admins can insert maintenance logs"
on public.maintenance_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'ADMIN'
  )
);

drop policy if exists "Admins can update maintenance logs" on public.maintenance_logs;
create policy "Admins can update maintenance logs"
on public.maintenance_logs
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'ADMIN'
  )
);

drop policy if exists "Admins can delete maintenance logs" on public.maintenance_logs;
create policy "Admins can delete maintenance logs"
on public.maintenance_logs
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'ADMIN'
  )
);

grant select, insert, update, delete on public.maintenance_logs to authenticated;
grant all on public.maintenance_logs to service_role;

create or replace function public.send_to_repair_v2(
  p_asset_id uuid,
  p_actor_id uuid,
  p_action_taken text,
  p_technician_name text default null,
  p_cost numeric default null,
  p_notes text default null
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
  v_log_id uuid;
  v_action_taken text := nullif(btrim(coalesce(p_action_taken, '')), '');
  v_technician_name text := nullif(btrim(coalesce(p_technician_name, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and role = 'ADMIN'
  ) then
    raise exception 'ACTOR_NOT_ADMIN';
  end if;

  if v_action_taken is null then
    raise exception 'INVALID_MAINTENANCE_ACTION';
  end if;

  if p_cost is not null and p_cost < 0 then
    raise exception 'INVALID_MAINTENANCE_COST';
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

  insert into public.maintenance_logs (
    asset_id,
    asset_tag_snapshot,
    action_taken,
    technician_name,
    cost,
    notes,
    created_by
  ) values (
    p_asset_id,
    v_asset.asset_tag,
    v_action_taken,
    v_technician_name,
    p_cost,
    v_notes,
    p_actor_id
  )
  returning id into v_log_id;

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
      'maintenance_log_id', v_log_id,
      'action_taken', v_action_taken,
      'technician_name', v_technician_name,
      'cost', p_cost,
      'note', v_notes
    )
  );

  return jsonb_build_object(
    'action', 'ASSET_SENT_TO_REPAIR',
    'asset_id', p_asset_id,
    'status', 'IN_REPAIR',
    'maintenance_log_id', v_log_id,
    'previous_user_id', v_asset.assigned_user_id
  );
end;
$$;

create or replace function public.log_asset_maintenance(
  p_asset_id uuid,
  p_actor_id uuid,
  p_action_taken text,
  p_technician_name text default null,
  p_cost numeric default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset record;
  v_log_id uuid;
  v_action_taken text := nullif(btrim(coalesce(p_action_taken, '')), '');
  v_technician_name text := nullif(btrim(coalesce(p_technician_name, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and role = 'ADMIN'
  ) then
    raise exception 'ACTOR_NOT_ADMIN';
  end if;

  if v_action_taken is null then
    raise exception 'INVALID_MAINTENANCE_ACTION';
  end if;

  if p_cost is not null and p_cost < 0 then
    raise exception 'INVALID_MAINTENANCE_COST';
  end if;

  select id, asset_tag, status
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
    raise exception 'ASSET_NOT_IN_REPAIR';
  end if;

  insert into public.maintenance_logs (
    asset_id,
    asset_tag_snapshot,
    action_taken,
    technician_name,
    cost,
    notes,
    created_by
  ) values (
    p_asset_id,
    v_asset.asset_tag,
    v_action_taken,
    v_technician_name,
    p_cost,
    v_notes,
    p_actor_id
  )
  returning id into v_log_id;

  insert into public.audit_logs (
    action,
    actor_id,
    entity_id,
    entity_type,
    detail
  ) values (
    'ASSET_MAINTENANCE_LOGGED',
    p_actor_id,
    p_asset_id,
    'asset',
    jsonb_build_object(
      'asset_tag', v_asset.asset_tag,
      'status', v_asset.status,
      'maintenance_log_id', v_log_id,
      'action_taken', v_action_taken,
      'technician_name', v_technician_name,
      'cost', p_cost,
      'note', v_notes
    )
  );

  return jsonb_build_object(
    'action', 'ASSET_MAINTENANCE_LOGGED',
    'asset_id', p_asset_id,
    'status', v_asset.status,
    'maintenance_log_id', v_log_id
  );
end;
$$;

grant execute on function public.send_to_repair_v2(uuid, uuid, text, text, numeric, text) to authenticated;
grant execute on function public.log_asset_maintenance(uuid, uuid, text, text, numeric, text) to authenticated;
grant execute on function public.send_to_repair_v2(uuid, uuid, text, text, numeric, text) to service_role;
grant execute on function public.log_asset_maintenance(uuid, uuid, text, text, numeric, text) to service_role;
