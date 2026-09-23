"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileSearch, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatBaht, formatDate } from "@/lib/format";
import { CATEGORIES, STATUSES, TABLES, categoryLabel, type Category, type Claim, type Status } from "@/lib/types";
import { EmptyState, PageHeader, Skeleton, StatusBadge } from "@/components/ui";

const PAGE_SIZE = 10;
type Row = Pick<Claim, "id" | "claim_no" | "title" | "category" | "amount" | "expense_date" | "status" | "receipt_no" | "created_by"> & {
  owner: { full_name: string } | null;
};

export default function ClaimsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ClaimsList />
    </Suspense>
  );
}

function ClaimsList() {
  const router = useRouter();
  const params = useSearchParams();
  const status = (params.get("status") as Status | null) ?? "";
  const category = (params.get("category") as Category | null) ?? "";
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? 1));

  const [search, setSearch] = useState(q);
  const [result, setResult] = useState<{ key: string; rows: Row[]; total: number } | null>(null);
  const key = `${status}|${category}|${q}|${page}`;
  const rows = result?.key === key ? result.rows : null;
  const total = result?.key === key ? result.total : 0;

  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      if (!("page" in patch)) next.delete("page");
      router.replace(`/claims${next.toString() ? `?${next}` : ""}`);
    },
    [params, router],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== q) setParam({ q: search || null });
    }, 350);
    return () => clearTimeout(t);
  }, [search, q, setParam]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let query = supabase
      .from(TABLES.claims)
      .select("id, claim_no, title, category, amount, expense_date, status, receipt_no, created_by, owner:expense_claim_approval_hzta_profiles!expense_claim_approval_hzta_claims_owner_fkey(full_name)", { count: "exact" })
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);
    if (q) query = query.or(`title.ilike.%${q}%,claim_no.ilike.%${q}%,description.ilike.%${q}%`);
    query.then(({ data, error, count }) => {
      if (cancelled) return;
      if (error) {
        toast.error("โหลดรายการไม่สำเร็จ", { description: error.message });
        setResult({ key, rows: [], total: 0 });
        return;
      }
      setResult({
        key,
        rows: (data ?? []).map((r) => ({ ...r, amount: Number(r.amount), owner: Array.isArray(r.owner) ? r.owner[0] ?? null : r.owner })) as Row[],
        total: count ?? 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [status, category, q, page, key]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter = Boolean(status || category || q);

  return (
    <>
      <PageHeader th="รายการเบิกจ่าย" en="Expense claims">
        <Link href="/claims/new" className="btn-primary">
          <Plus className="h-4 w-4" /> สร้างรายการ
        </Link>
      </PageHeader>

      <div className="card mb-4 p-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="ค้นหาชื่อรายการ / เลขที่ EXP / รายละเอียด"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="hidden h-4 w-4 text-slate-400 md:block" />
            <select className="input md:w-44 cursor-pointer" value={status} onChange={(e) => setParam({ status: e.target.value || null })}>
              <option value="">ทุกสถานะ</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.th}</option>
              ))}
            </select>
            <select className="input md:w-48 cursor-pointer" value={category} onChange={(e) => setParam({ category: e.target.value || null })}>
              <option value="">ทุกหมวดหมู่</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.th}</option>
              ))}
            </select>
            {hasFilter && (
              <button
                onClick={() => {
                  setSearch("");
                  setParam({ status: null, category: null, q: null });
                }}
                className="btn-ghost px-3"
                title="ล้างตัวกรอง"
              >
                <X className="h-4 w-4" /> ล้าง
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip active={!status} onClick={() => setParam({ status: null })}>ทั้งหมด</Chip>
          {STATUSES.map((s) => (
            <Chip key={s.value} active={status === s.value} onClick={() => setParam({ status: s.value })}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.th}
            </Chip>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden animate-fade-up" style={{ animationDelay: "120ms" }}>
        {rows === null ? (
          <TableSkeleton bare />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<FileSearch className="h-7 w-7" />}
            title={hasFilter ? "ไม่พบรายการที่ตรงกับตัวกรอง" : "ยังไม่มีรายการเบิกจ่าย"}
            hint={hasFilter ? "ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง" : "เริ่มต้นด้วยการสร้างรายการเบิกจ่ายรายการแรก"}
            action={
              !hasFilter && (
                <Link href="/claims/new" className="btn-primary">
                  <Plus className="h-4 w-4" /> สร้างรายการ
                </Link>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50/95 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 backdrop-blur">
                <tr>
                  <th className="px-5 py-3">เลขที่</th>
                  <th className="px-5 py-3">รายการ</th>
                  <th className="px-5 py-3">หมวดหมู่</th>
                  <th className="px-5 py-3">ผู้เบิก</th>
                  <th className="px-5 py-3">วันที่ใช้จ่าย</th>
                  <th className="px-5 py-3 text-right">จำนวนเงิน</th>
                  <th className="px-5 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 row-stagger">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/claims/${r.id}`)}
                    className="group cursor-pointer transition-colors duration-150 hover:bg-emerald-50/60"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-500 group-hover:text-emerald-700">{r.claim_no}</td>
                    <td className="max-w-[280px] px-5 py-3.5">
                      <p className="truncate font-medium text-slate-800">{r.title}</p>
                      {r.receipt_no && <p className="text-xs text-slate-400">ใบเสร็จ {r.receipt_no}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{categoryLabel(r.category)}</td>
                    <td className="px-5 py-3.5 text-slate-600">{r.owner?.full_name ?? "-"}</td>
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{formatDate(r.expense_date)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-800">{formatBaht(r.amount)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-sm text-slate-500">
            <p>
              แสดง {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} จาก {total.toLocaleString()} รายการ
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })} className="btn-secondary px-2.5 py-1.5">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`e${i}`} className="px-2 text-slate-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setParam({ page: String(p) })}
                      className={`min-w-9 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                        p === page ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200/70"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button disabled={page >= pages} onClick={() => setParam({ page: String(page + 1) })} className="btn-secondary px-2.5 py-1.5">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-all duration-150 cursor-pointer ${
        active ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100 hover:ring-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function TableSkeleton({ bare }: { bare?: boolean }) {
  const body = (
    <div className="divide-y divide-slate-100">
      <div className="flex gap-6 bg-slate-50 px-5 py-3">
        {[80, 200, 90, 100, 90, 80, 80].map((w, i) => (
          <Skeleton key={i} className="h-3" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-4">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-52" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="ml-auto h-3.5 w-20" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
  if (bare) return body;
  return (
    <>
      <PageHeader th="รายการเบิกจ่าย" en="Expense claims" />
      <div className="card overflow-hidden">{body}</div>
    </>
  );
}
