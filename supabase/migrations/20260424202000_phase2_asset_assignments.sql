create extension if not exists pgcrypto;

create table if not exists public.asset_assignments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null,
  user_id uuid not null,
  status text not null check (status in ('ASSIGNED', 'RETURNED')),
  assigned_at timestamptz not null default now(),
  returned_at timestamptz null,
  assigned_by uuid null,
  returned_by uuid null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_assignments_asset_id_fkey
    foreign key (asset_id) references public.assets(id) on delete cascade,
  constraint asset_assignments_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete restrict,
  constraint asset_assignments_assigned_by_fkey
    foreign key (assigned_by) references public.profiles(id) on delete set null,
  constraint asset_assignments_returned_by_fkey
    foreign key (returned_by) references public.profiles(id) on delete set null,
  constraint asset_assignments_return_order
    check (returned_at is null or returned_at >= assigned_at)
);

create index if not exists asset_assignments_asset_id_assigned_at_idx
  on public.asset_assignments (asset_id, assigned_at desc);

create index if not exists asset_assignments_user_id_assigned_at_idx
  on public.asset_assignments (user_id, assigned_at desc);

create unique index if not exists asset_assignments_open_assignment_idx
  on public.asset_assignments (asset_id)
  where returned_at is null;

create or replace function public.set_asset_assignments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_asset_assignments_updated_at on public.asset_assignments;

create trigger set_asset_assignments_updated_at
before update on public.asset_assignments
for each row
execute function public.set_asset_assignments_updated_at();

insert into public.asset_assignments (
  asset_id,
  user_id,
  status,
  assigned_at,
  assigned_by,
  created_at,
  updated_at
)
select
  assets.id,
  assets.assigned_user_id,
  'ASSIGNED',
  coalesce(assets.updated_at, assets.created_at, now()),
  assets.created_by,
  coalesce(assets.updated_at, assets.created_at, now()),
  coalesce(assets.updated_at, assets.created_at, now())
from public.assets
where assets.assigned_user_id is not null
  and not exists (
    select 1
    from public.asset_assignments
    where asset_assignments.asset_id = assets.id
      and asset_assignments.returned_at is null
  );

alter table public.asset_assignments enable row level security;

drop policy if exists "Admins can view all asset assignments" on public.asset_assignments;
create policy "Admins can view all asset assignments"
on public.asset_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'ADMIN'
  )
);

drop policy if exists "Users can view their own asset assignments" on public.asset_assignments;
create policy "Users can view their own asset assignments"
on public.asset_assignments
for select
to authenticated
using (user_id = auth.uid());

grant select on public.asset_assignments to authenticated;
grant all on public.asset_assignments to service_role;

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
    user_id,
    status,
    assigned_at,
    assigned_by,
    note
  ) values (
    p_asset_id,
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

grant execute on function public.assign_asset_to_user(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.return_asset_to_stock(uuid, uuid, text) to authenticated;
grant execute on function public.assign_asset_to_user(uuid, uuid, uuid, text) to service_role;
grant execute on function public.return_asset_to_stock(uuid, uuid, text) to service_role;
