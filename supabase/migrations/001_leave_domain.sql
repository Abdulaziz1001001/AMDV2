-- Leave Domain Migration (Supabase)
-- Features: notifications, leave_balances, leave_requests extensions,
-- realtime publications, storage bucket, and strict RLS policies.

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------
-- Optional profiles table (if not already present)
-- -------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'employee' check (role in ('admin', 'manager', 'employee')),
  department_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'manager'
  );
$$;

-- -------------------------------------------------------------------
-- leave_requests table (create or alter)
-- -------------------------------------------------------------------
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references auth.users(id) on delete cascade,
  department_id uuid,
  start_date date not null,
  end_date date not null,
  requested_days int not null check (requested_days > 0),
  type text not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'rejected')),
  attachment_url text,
  approved_by uuid references auth.users(id),
  approved_by_role text check (approved_by_role in ('admin', 'manager')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leave_requests
  add column if not exists attachment_url text,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_by_role text check (approved_by_role in ('admin', 'manager')),
  add column if not exists approved_at timestamptz;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'leave_requests_status_check'
  ) then
    alter table public.leave_requests drop constraint leave_requests_status_check;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'leave_requests_status_check'
  ) then
    alter table public.leave_requests
      add constraint leave_requests_status_check
      check (status in ('pending', 'approved', 'declined', 'rejected'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'leave_requests_type_check_10_reasons'
  ) then
    alter table public.leave_requests
      add constraint leave_requests_type_check_10_reasons
      check (
        type in (
          'Sick Leave',
          'Annual Leave',
          'Unpaid Leave',
          'Emergency Leave',
          'Maternity/Paternity Leave',
          'Bereavement Leave',
          'Study Leave',
          'Hajj/Umrah Leave',
          'Marriage Leave',
          'Work Injury'
        )
      );
  end if;
end $$;

create index if not exists idx_leave_requests_employee on public.leave_requests(employee_id);
create index if not exists idx_leave_requests_department on public.leave_requests(department_id);
create index if not exists idx_leave_requests_status on public.leave_requests(status);

-- -------------------------------------------------------------------
-- notifications table
-- -------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  leave_request_id uuid references public.leave_requests(id) on delete set null,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient_created
  on public.notifications(recipient_user_id, created_at desc);

-- -------------------------------------------------------------------
-- leave_balances table
-- -------------------------------------------------------------------
create table if not exists public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  annual_balance_days numeric(8,2) not null default 0 check (annual_balance_days >= 0),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leave_balances_user on public.leave_balances(user_id);

-- -------------------------------------------------------------------
-- Enable RLS
-- -------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.leave_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.leave_balances enable row level security;

-- profiles policies
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write
on public.profiles for all
using (public.is_admin())
with check (public.is_admin());

-- leave_requests policies
drop policy if exists leave_requests_employee_read_own on public.leave_requests;
create policy leave_requests_employee_read_own
on public.leave_requests for select
using (
  employee_id = auth.uid()
  or public.is_admin()
  or (
    public.is_manager()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.department_id = leave_requests.department_id
    )
  )
);

drop policy if exists leave_requests_employee_create_own on public.leave_requests;
create policy leave_requests_employee_create_own
on public.leave_requests for insert
with check (
  employee_id = auth.uid()
  and status = 'pending'
);

drop policy if exists leave_requests_admin_or_manager_update on public.leave_requests;
create policy leave_requests_admin_or_manager_update
on public.leave_requests for update
using (
  public.is_admin()
  or (
    public.is_manager()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.department_id = leave_requests.department_id
    )
  )
)
with check (
  public.is_admin()
  or (
    public.is_manager()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.department_id = leave_requests.department_id
    )
  )
);

-- notifications policies
drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own
on public.notifications for select
using (recipient_user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_mark_own_read on public.notifications;
create policy notifications_mark_own_read
on public.notifications for update
using (recipient_user_id = auth.uid() or public.is_admin())
with check (recipient_user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_admin_insert on public.notifications;
create policy notifications_admin_insert
on public.notifications for insert
with check (public.is_admin() or public.is_manager());

-- leave_balances policies
drop policy if exists leave_balances_read_own on public.leave_balances;
create policy leave_balances_read_own
on public.leave_balances for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists leave_balances_admin_write on public.leave_balances;
create policy leave_balances_admin_write
on public.leave_balances for all
using (public.is_admin())
with check (public.is_admin());

-- -------------------------------------------------------------------
-- Realtime publication
-- -------------------------------------------------------------------
alter publication supabase_realtime add table public.leave_requests;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.leave_balances;

-- -------------------------------------------------------------------
-- Storage bucket + policies
-- -------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leave-attachments',
  'leave-attachments',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists leave_attachments_upload_own on storage.objects;
create policy leave_attachments_upload_own
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'leave-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists leave_attachments_select_authorized on storage.objects;
create policy leave_attachments_select_authorized
on storage.objects for select
to authenticated
using (
  bucket_id = 'leave-attachments'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
    or public.is_manager()
  )
);
