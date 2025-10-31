-- Invoice Schedule Permissions System
-- Adds role-based access control for invoicing features

-- 1) Permission Settings Table
create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  permission_key text not null,
  granted_by uuid references public.users(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(user_id, permission_key)
);

-- 2) Invoice Schedule Tables
create table if not exists public.invoice_schedules (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  week_commencing date not null,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft', 'sent', 'approved')),
  total_amount numeric not null default 0,
  job_count int not null default 0
);

create table if not exists public.invoice_schedule_items (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.invoice_schedules(id) on delete cascade,
  job_id uuid not null references public.jobs(id),
  invoice_type text not null check (invoice_type in ('full', 'partial')),
  percentage numeric,
  quoted_amount numeric not null,
  additions_amount numeric not null default 0,
  invoice_amount numeric not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.job_invoice_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  invoice_date date not null,
  invoice_type text not null check (invoice_type in ('full', 'partial')),
  percentage numeric,
  amount numeric not null,
  schedule_id uuid references public.invoice_schedules(id),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

-- 3) Add invoice tracking to jobs
alter table public.jobs
  add column if not exists total_invoiced numeric default 0,
  add column if not exists last_invoice_date date,
  add column if not exists invoice_status text default 'pending'
    check (invoice_status in ('pending', 'partial', 'complete'));

-- 4) Permission Helper Functions
create or replace function public.user_has_permission(
  p_user_id uuid,
  p_permission text
) returns boolean language sql stable as $$
  select exists (
    select 1 from public.user_permissions
    where user_id = p_user_id
      and permission_key = p_permission
      and revoked_at is null
  )
$$;

create or replace function public.can_access_invoicing(p_user_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.users u
    where u.id = p_user_id
      and (
        u.role = 'director'
        or public.user_has_permission(p_user_id, 'invoice_schedule')
      )
  )
$$;

-- 5) Grant/Revoke Permission Functions (Director only)
create or replace function public.grant_permission(
  p_target_user_id uuid,
  p_permission text
) returns void language plpgsql security definer as $$
declare
  v_granter_id uuid;
  v_granter_role text;
  v_account_id uuid;
begin
  -- Get current user
  v_granter_id := auth.uid();

  -- Check if granter is director
  select role, account_id into v_granter_role, v_account_id
  from public.users where id = v_granter_id;

  if v_granter_role != 'director' then
    raise exception 'Only directors can grant permissions';
  end if;

  -- Grant permission
  insert into public.user_permissions (
    user_id, account_id, permission_key, granted_by
  ) values (
    p_target_user_id, v_account_id, p_permission, v_granter_id
  ) on conflict (user_id, permission_key) do update
    set revoked_at = null,
        granted_by = v_granter_id,
        granted_at = now();
end$$;

create or replace function public.revoke_permission(
  p_target_user_id uuid,
  p_permission text
) returns void language plpgsql security definer as $$
declare
  v_revoker_role text;
begin
  -- Check if revoker is director
  select role into v_revoker_role
  from public.users where id = auth.uid();

  if v_revoker_role != 'director' then
    raise exception 'Only directors can revoke permissions';
  end if;

  -- Revoke permission
  update public.user_permissions
    set revoked_at = now()
  where user_id = p_target_user_id
    and permission_key = p_permission
    and revoked_at is null;
end$$;

-- 6) Invoice Schedule View with Job Details
create or replace view public.v_invoiceable_jobs as
select
  j.id,
  j.reference,
  j.location,
  j.client_name,
  j.end_user,
  j.status,
  j.percent_complete,
  j.total_invoiced,
  j.invoice_status,
  q.total_amount as quoted_amount,
  coalesce(
    (select sum(amount) from public.job_variations where job_id = j.id),
    0
  ) as additions_amount,
  q.total_amount + coalesce(
    (select sum(amount) from public.job_variations where job_id = j.id),
    0
  ) - coalesce(j.total_invoiced, 0) as remaining_to_invoice,
  case
    when j.percent_complete = 100 then 'ready'
    when j.percent_complete > 0 and j.percent_complete < 100 then 'partial'
    else 'pending'
  end as invoice_readiness
from public.jobs j
left join public.quotes q on q.id = j.quote_id
where j.status in ('in_progress', 'snagging', 'completed')
  and j.account_id = (select account_id from public.users where id = auth.uid());

-- 7) Indexes
create index if not exists idx_user_perms_user on public.user_permissions (user_id, permission_key) where revoked_at is null;
create index if not exists idx_invoice_sched_week on public.invoice_schedules (week_commencing, account_id);
create index if not exists idx_invoice_items_sched on public.invoice_schedule_items (schedule_id);
create index if not exists idx_job_invoice_hist on public.job_invoice_history (job_id, invoice_date);

-- 8) RLS Policies
alter table public.user_permissions enable row level security;
alter table public.invoice_schedules enable row level security;
alter table public.invoice_schedule_items enable row level security;
alter table public.job_invoice_history enable row level security;

-- Permission table: Directors only
create policy user_perms_director_all on public.user_permissions
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'director'
        and u.account_id = user_permissions.account_id
    )
  );

-- Invoice schedules: Read for permitted users, write for directors/permitted
create policy invoice_sched_read on public.invoice_schedules
  for select using (
    public.can_access_invoicing(auth.uid())
    and account_id = (select account_id from public.users where id = auth.uid())
  );

create policy invoice_sched_write on public.invoice_schedules
  for all using (
    public.can_access_invoicing(auth.uid())
    and account_id = (select account_id from public.users where id = auth.uid())
  );

-- Invoice items: Same as schedules
create policy invoice_items_read on public.invoice_schedule_items
  for select using (
    exists (
      select 1 from public.invoice_schedules s
      where s.id = schedule_id
        and public.can_access_invoicing(auth.uid())
    )
  );

create policy invoice_items_write on public.invoice_schedule_items
  for all using (
    exists (
      select 1 from public.invoice_schedules s
      where s.id = schedule_id
        and public.can_access_invoicing(auth.uid())
    )
  );

-- Job invoice history: Read for all assigned, write for permitted
create policy job_inv_hist_read on public.job_invoice_history
  for select using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id
        and j.account_id = (select account_id from public.users where id = auth.uid())
    )
  );

create policy job_inv_hist_write on public.job_invoice_history
  for insert using (
    public.can_access_invoicing(auth.uid())
  );

-- Sample Permission Grant
-- Directors can run this to grant invoice access:
-- SELECT public.grant_permission('user-uuid-here', 'invoice_schedule');