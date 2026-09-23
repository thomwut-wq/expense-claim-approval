# ระบบอนุมัติค่าใช้จ่าย · Expense Claim Approval

Internal dashboard for a Thai finance team to submit, review, approve and pay employee expense claims.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth + RLS) · Recharts · lucide-react · sonner

## Features

- Bilingual UI (Thai primary, small English subtitles), Sarabun font
- Roles: `admin` (approve / reject / mark paid, sees everything) and `staff` (own claims only)
- Claim workflow: `DRAFT → SUBMITTED → APPROVED | REJECTED → PAID`
  - rejection requires a reason, paying requires a receipt number (enforced by DB check constraints)
  - soft delete via `is_deleted`
- Running claim number `EXP-YYYYMM-XXXX` generated atomically by a Postgres function + trigger
- Dashboard KPIs with count-up animation, 6-month approved-amount bar chart, pending quick list
- Claims list with search, status/category filters and pagination
- Confirmation modals, toasts, skeleton loaders, entrance animations
- Change-password from the avatar menu; users are managed in the Supabase dashboard

## Database

All tables/functions are prefixed `expense_claim_approval_hzta_` (the Supabase project is shared).

| Object | Purpose |
| --- | --- |
| `expense_claim_approval_hzta_profiles` | `id → auth.users`, `full_name`, `role` |
| `expense_claim_approval_hzta_claims` | claims (dates stored as `DATE`, amounts as `numeric(12,2)`) |
| `expense_claim_approval_hzta_claim_counters` | per-month counter used for running IDs |
| `expense_claim_approval_hzta_next_claim_no(date)` | atomic running-number generator |
| `expense_claim_approval_hzta_role()` / `_is_admin()` | helpers used by RLS policies |

Schema + RLS: [`supabase/schema.sql`](supabase/schema.sql)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY

# one-time: create schema + seed (needs SUPABASE_DB_URL, ADMIN_PASSWORD, STAFF_PASSWORD in env)
node scripts/migrate.mjs
node scripts/seed.mjs

npm run dev
```

Users log in with a username (mapped to `<username>@expenseclaim.dev`) or a full email.
Additional users are created in **Supabase → Authentication → Users**; a `staff` profile is created automatically on first login. Promote to admin by setting `role = 'admin'` in the profiles table.

## Deploy (Vercel)

Set the environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on the project and deploy — no other configuration is required.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | start dev server |
| `npm run build` / `npm start` | production build / serve |
| `npm run lint` | ESLint |
| `node scripts/migrate.mjs` | apply `supabase/schema.sql` |
| `node scripts/seed.mjs` | create seed users + ~27 sample claims (idempotent) |
