-- Labour Calendar System - Complete Schema
-- Includes tables, views, RLS, and functions for calendar-based labour management

-- 1) CORE TABLES
create table if not exists public.job_labour_bank (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  role text not null check (role in ('installer','supervisor')),
  crew_mode text check (crew_mode is null or crew_mode in ('van','foot')),
  days_allocated numeric not null check (days_allocated >= 0),
  days_remaining numeric not null check (days_remaining >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, role, crew_mode)
);

create table if not exists public.labour_allocations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  work_date date not null,
  role text not null check (role in ('installer','supervisor')),
  crew_mode text check (crew_mode is null or crew_mode in ('van','foot')),
  headcount int not null default 0 check (headcount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, work_date, role, crew_mode)
);

create table if not exists public.job_time_presets (
  job_id uuid primary key references public.jobs(id) on delete cascade,
  day_length_hours numeric not null default 7 check (day_length_hours > 0),
  non_product_hours_per_day numeric not null default 0.6 check (non_product_hours_per_day >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) CALENDAR VIEW for UI
create or replace view public.v_labour_calendar as
select
  la.job_id,
  la.work_date,
  sum(case when la.role = 'installer' and la.crew_mode = 'van' then la.headcount else 0 end) as van_crews,
  sum(case when la.role = 'installer' and la.crew_mode = 'foot' then la.headcount else 0 end) as foot_installers,
  sum(case when la.role = 'supervisor' then la.headcount else 0 end) as supervisors,
  -- Calculate capacity
  greatest(0,
    ((sum(case when la.role = 'installer' and la.crew_mode = 'van' then la.headcount * 2 else 0 end) +
     sum(case when la.role = 'installer' and la.crew_mode = 'foot' then la.headcount else 0 end)) *
     max(coalesce(jtp.day_length_hours, 7))) -
    (max(coalesce(jtp.non_product_hours_per_day, 0.6)) *
     (sum(case when la.role = 'installer' and la.crew_mode = 'van' then la.headcount * 2 else 0 end) +
      sum(case when la.role = 'installer' and la.crew_mode = 'foot' then la.headcount else 0 end)))
  )::numeric(10,2) as daily_capacity_hours
from public.labour_allocations la
left join public.job_time_presets jtp on jtp.job_id = la.job_id
group by la.job_id, la.work_date;

-- 3) BANK SUMMARY VIEW
create or replace view public.v_labour_bank_summary as
select
  lb.job_id,
  lb.role,
  lb.crew_mode,
  lb.days_allocated,
  lb.days_allocated - coalesce(
    (select sum(la.headcount)::numeric
     from public.labour_allocations la
     where la.job_id = lb.job_id
       and la.role = lb.role
       and coalesce(la.crew_mode, '-') = coalesce(lb.crew_mode, '-')
    ), 0
  ) as days_remaining,
  round(
    100 * coalesce(
      (select sum(la.headcount)::numeric
       from public.labour_allocations la
       where la.job_id = lb.job_id
         and la.role = lb.role
         and coalesce(la.crew_mode, '-') = coalesce(lb.crew_mode, '-')
      ), 0
    ) / nullif(lb.days_allocated, 0), 1
  ) as percent_used
from public.job_labour_bank lb;

-- 4) HELPER FUNCTIONS
create or replace function public.get_labour_calendar_month(
  p_job_id uuid,
  p_year int,
  p_month int
) returns table (
  work_date date,
  van_crews int,
  foot_installers int,
  supervisors int,
  capacity_hours numeric
) language sql stable as $$
  select
    cal.work_date::date,
    coalesce(lc.van_crews, 0)::int,
    coalesce(lc.foot_installers, 0)::int,
    coalesce(lc.supervisors, 0)::int,
    coalesce(lc.daily_capacity_hours, 0)::numeric
  from generate_series(
    date_trunc('month', make_date(p_year, p_month, 1)),
    (date_trunc('month', make_date(p_year, p_month, 1)) + interval '1 month - 1 day')::date,
    '1 day'::interval
  ) cal(work_date)
  left join public.v_labour_calendar lc
    on lc.work_date = cal.work_date::date
    and lc.job_id = p_job_id
  order by cal.work_date;
$$;

-- 5) UPSERT ALLOCATION FUNCTION
create or replace function public.save_labour_allocation(
  p_job_id uuid,
  p_date date,
  p_van_crews int,
  p_foot_installers int,
  p_supervisors int
) returns void language plpgsql as $$
begin
  -- Van crews
  insert into public.labour_allocations (job_id, work_date, role, crew_mode, headcount)
  values (p_job_id, p_date, 'installer', 'van', p_van_crews)
  on conflict (job_id, work_date, role, crew_mode)
  do update set headcount = excluded.headcount, updated_at = now();

  -- Foot installers
  insert into public.labour_allocations (job_id, work_date, role, crew_mode, headcount)
  values (p_job_id, p_date, 'installer', 'foot', p_foot_installers)
  on conflict (job_id, work_date, role, crew_mode)
  do update set headcount = excluded.headcount, updated_at = now();

  -- Supervisors
  insert into public.labour_allocations (job_id, work_date, role, crew_mode, headcount)
  values (p_job_id, p_date, 'supervisor', null, p_supervisors)
  on conflict (job_id, work_date, role, crew_mode)
  do update set headcount = excluded.headcount, updated_at = now();

  -- Clean up zero allocations
  delete from public.labour_allocations
  where job_id = p_job_id and work_date = p_date and headcount = 0;
end$$;

-- 6) CLEAR DAY FUNCTION
create or replace function public.clear_labour_day(
  p_job_id uuid,
  p_date date
) returns void language plpgsql as $$
begin
  delete from public.labour_allocations
  where job_id = p_job_id and work_date = p_date;
end$$;

-- 7) INDEXES
create index if not exists idx_labour_alloc_job_date on public.labour_allocations (job_id, work_date);
create index if not exists idx_labour_alloc_date on public.labour_allocations (work_date);
create index if not exists idx_labour_bank_job on public.job_labour_bank (job_id);

-- 8) RLS POLICIES
alter table public.job_labour_bank enable row level security;
alter table public.labour_allocations enable row level security;
alter table public.job_time_presets enable row level security;

-- Read: Same account + assigned to job
create policy labour_bank_read on public.job_labour_bank
  for select using (
    exists (
      select 1 from public.jobs j
      join public.users u on u.account_id = j.account_id
      where j.id = job_id and u.id = auth.uid()
    )
    and exists (
      select 1 from public.assignments a
      where a.job_id = job_labour_bank.job_id and a.user_id = auth.uid()
    )
  );

create policy labour_alloc_read on public.labour_allocations
  for select using (
    exists (
      select 1 from public.jobs j
      join public.users u on u.account_id = j.account_id
      where j.id = job_id and u.id = auth.uid()
    )
    and exists (
      select 1 from public.assignments a
      where a.job_id = labour_allocations.job_id and a.user_id = auth.uid()
    )
  );

-- Write: Director only
create policy labour_bank_write on public.job_labour_bank
  for all using (
    exists (
      select 1 from public.users u
      join public.jobs j on j.account_id = u.account_id
      where u.id = auth.uid() and u.role = 'director' and j.id = job_id
    )
  );

create policy labour_alloc_write on public.labour_allocations
  for all using (
    exists (
      select 1 from public.users u
      join public.jobs j on j.account_id = u.account_id
      where u.id = auth.uid() and u.role = 'director' and j.id = job_id
    )
  );

create policy time_presets_read on public.job_time_presets
  for select using (
    exists (
      select 1 from public.jobs j
      join public.users u on u.account_id = j.account_id
      where j.id = job_id and u.id = auth.uid()
    )
  );

create policy time_presets_write on public.job_time_presets
  for all using (
    exists (
      select 1 from public.users u
      join public.jobs j on j.account_id = u.account_id
      where u.id = auth.uid() and u.role = 'director' and j.id = job_id
    )
  );

-- 9) TRIGGERS
create or replace function public.tg_update_labour_bank()
returns trigger language plpgsql as $$
begin
  -- Recalculate days remaining for affected job
  update public.job_labour_bank lb
  set days_remaining = greatest(0,
    lb.days_allocated - coalesce(
      (select sum(la.headcount)::numeric
       from public.labour_allocations la
       where la.job_id = lb.job_id
         and la.role = lb.role
         and coalesce(la.crew_mode, '-') = coalesce(lb.crew_mode, '-')
      ), 0
    )
  ),
  updated_at = now()
  where lb.job_id = coalesce(NEW.job_id, OLD.job_id);

  return NEW;
end$$;

create trigger tg_after_labour_alloc_change
after insert or update or delete on public.labour_allocations
for each row execute function public.tg_update_labour_bank();

-- 10) SAMPLE DATA SEEDER
create or replace function public.seed_job_labour_bank(p_job_id uuid)
returns void language plpgsql as $$
begin
  -- Default labour allocation based on job size
  insert into public.job_labour_bank (job_id, role, crew_mode, days_allocated, days_remaining)
  values
    (p_job_id, 'installer', 'van', 20, 20),
    (p_job_id, 'installer', 'foot', 30, 30),
    (p_job_id, 'supervisor', null, 10, 10)
  on conflict (job_id, role, crew_mode) do nothing;

  -- Default time presets
  insert into public.job_time_presets (job_id)
  values (p_job_id)
  on conflict (job_id) do nothing;
end$$;