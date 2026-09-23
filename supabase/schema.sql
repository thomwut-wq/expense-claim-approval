-- Expense Claim Approval — schema (all objects prefixed with expense_claim_approval_hzta_)
create extension if not exists pgcrypto;

-- Profiles ------------------------------------------------------------------
create table if not exists public.expense_claim_approval_hzta_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

create or replace function public.expense_claim_approval_hzta_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.expense_claim_approval_hzta_profiles where id = auth.uid()),
    'staff'
  );
$$;

create or replace function public.expense_claim_approval_hzta_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.expense_claim_approval_hzta_role() = 'admin';
$$;

-- Running number --------------------------------------------------------------
create table if not exists public.expense_claim_approval_hzta_claim_counters (
  period text primary key,
  last_value integer not null default 0
);

create or replace function public.expense_claim_approval_hzta_next_claim_no(p_date date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(p_date, 'YYYYMM');
  v_next integer;
begin
  insert into public.expense_claim_approval_hzta_claim_counters (period, last_value)
  values (v_period, 1)
  on conflict (period) do update
    set last_value = expense_claim_approval_hzta_claim_counters.last_value + 1
  returning last_value into v_next;
  return 'EXP-' || v_period || '-' || lpad(v_next::text, 4, '0');
end;
$$;

-- Claims ----------------------------------------------------------------------
create table if not exists public.expense_claim_approval_hzta_claims (
  id uuid primary key default gen_random_uuid(),
  claim_no text not null unique,
  title text not null,
  category text not null check (category in ('travel', 'entertainment', 'office', 'phone', 'other')),
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null,
  description text not null default '',
  receipt_no text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID')),
  reject_reason text,
  created_by uuid not null references auth.users(id) on delete cascade,
  approved_by uuid references auth.users(id),
  submitted_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_claim_approval_hzta_reject_reason_chk
    check (status <> 'REJECTED' or (reject_reason is not null and length(trim(reject_reason)) > 0)),
  constraint expense_claim_approval_hzta_receipt_chk
    check (status <> 'PAID' or (receipt_no is not null and length(trim(receipt_no)) > 0))
);

create index if not exists expense_claim_approval_hzta_claims_status_idx on public.expense_claim_approval_hzta_claims (status);
create index if not exists expense_claim_approval_hzta_claims_created_by_idx on public.expense_claim_approval_hzta_claims (created_by);
create index if not exists expense_claim_approval_hzta_claims_expense_date_idx on public.expense_claim_approval_hzta_claims (expense_date desc);

create or replace function public.expense_claim_approval_hzta_claims_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.claim_no is null or new.claim_no = '' then
    new.claim_no := public.expense_claim_approval_hzta_next_claim_no(coalesce(new.expense_date, (now() at time zone 'Asia/Bangkok')::date));
  end if;
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists expense_claim_approval_hzta_claims_bi on public.expense_claim_approval_hzta_claims;
create trigger expense_claim_approval_hzta_claims_bi
  before insert on public.expense_claim_approval_hzta_claims
  for each row execute function public.expense_claim_approval_hzta_claims_before_insert();

create or replace function public.expense_claim_approval_hzta_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists expense_claim_approval_hzta_claims_bu on public.expense_claim_approval_hzta_claims;
create trigger expense_claim_approval_hzta_claims_bu
  before update on public.expense_claim_approval_hzta_claims
  for each row execute function public.expense_claim_approval_hzta_touch_updated_at();

-- Claim number must be immutable and status transitions are enforced in the app +
-- via the check constraints above.

-- Soft delete goes through an RPC because a row with is_deleted = true no longer
-- passes the SELECT policy, which makes a direct UPDATE fail under RLS.
create or replace function public.expense_claim_approval_hzta_soft_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.expense_claim_approval_hzta_claims%rowtype;
  v_admin boolean := public.expense_claim_approval_hzta_is_admin();
begin
  select * into v_claim from public.expense_claim_approval_hzta_claims where id = p_id and not is_deleted;
  if not found then
    raise exception 'claim not found' using errcode = 'P0002';
  end if;
  if not (v_admin and v_claim.status <> 'PAID')
     and not (v_claim.created_by = auth.uid() and v_claim.status = 'DRAFT') then
    raise exception 'not allowed to delete this claim' using errcode = '42501';
  end if;
  update public.expense_claim_approval_hzta_claims set is_deleted = true where id = p_id;
end;
$$;

revoke all on function public.expense_claim_approval_hzta_soft_delete(uuid) from public;
grant execute on function public.expense_claim_approval_hzta_soft_delete(uuid) to authenticated;

-- Row Level Security ------------------------------------------------------------
alter table public.expense_claim_approval_hzta_profiles enable row level security;
alter table public.expense_claim_approval_hzta_claims enable row level security;
alter table public.expense_claim_approval_hzta_claim_counters enable row level security;

drop policy if exists "hzta_profiles_select" on public.expense_claim_approval_hzta_profiles;
create policy "hzta_profiles_select" on public.expense_claim_approval_hzta_profiles
  for select to authenticated
  using (id = auth.uid() or public.expense_claim_approval_hzta_is_admin());

drop policy if exists "hzta_profiles_insert_self" on public.expense_claim_approval_hzta_profiles;
create policy "hzta_profiles_insert_self" on public.expense_claim_approval_hzta_profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'staff');

drop policy if exists "hzta_profiles_update_self" on public.expense_claim_approval_hzta_profiles;
create policy "hzta_profiles_update_self" on public.expense_claim_approval_hzta_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.expense_claim_approval_hzta_role());

drop policy if exists "hzta_claims_select" on public.expense_claim_approval_hzta_claims;
create policy "hzta_claims_select" on public.expense_claim_approval_hzta_claims
  for select to authenticated
  using (
    not is_deleted
    and (public.expense_claim_approval_hzta_is_admin() or created_by = auth.uid())
  );

drop policy if exists "hzta_claims_insert" on public.expense_claim_approval_hzta_claims;
create policy "hzta_claims_insert" on public.expense_claim_approval_hzta_claims
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and status in ('DRAFT', 'SUBMITTED')
    and not is_deleted
  );

drop policy if exists "hzta_claims_update_admin" on public.expense_claim_approval_hzta_claims;
create policy "hzta_claims_update_admin" on public.expense_claim_approval_hzta_claims
  for update to authenticated
  using (public.expense_claim_approval_hzta_is_admin())
  with check (public.expense_claim_approval_hzta_is_admin());

drop policy if exists "hzta_claims_update_own_draft" on public.expense_claim_approval_hzta_claims;
create policy "hzta_claims_update_own_draft" on public.expense_claim_approval_hzta_claims
  for update to authenticated
  using (created_by = auth.uid() and status = 'DRAFT' and not is_deleted)
  with check (created_by = auth.uid() and status in ('DRAFT', 'SUBMITTED'));

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.expense_claim_approval_hzta_profiles to authenticated;
grant select, insert, update on public.expense_claim_approval_hzta_claims to authenticated;
grant execute on function public.expense_claim_approval_hzta_role() to authenticated;
grant execute on function public.expense_claim_approval_hzta_is_admin() to authenticated;

-- Allow PostgREST to embed the claim owner's profile
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'expense_claim_approval_hzta_claims_owner_fkey') then
    alter table public.expense_claim_approval_hzta_claims
      add constraint expense_claim_approval_hzta_claims_owner_fkey
      foreign key (created_by) references public.expense_claim_approval_hzta_profiles(id) on delete cascade;
  end if;
end $$;
