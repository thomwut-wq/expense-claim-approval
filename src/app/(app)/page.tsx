"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, BadgeCheck, Banknote, Clock3, Inbox, Wallet } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatBaht, formatDate, monthLabelTh, monthStartBangkok } from "@/lib/format";
import { TABLES, categoryLabel, type Claim } from "@/lib/types";
import { useProfile } from "@/components/app-shell";
import { EmptyState, PageHeader, Skeleton, StatusBadge, useCountUp } from "@/components/ui";

type ClaimLite = Pick<Claim, "id" | "claim_no" | "title" | "category" | "amount" | "expense_date" | "status" | "approved_at" | "paid_at" | "created_by">;

export default function DashboardPage() {
  const profile = useProfile();
  const [claims, setClaims] = useState<ClaimLite[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from(TABLES.claims)
      .select("id, claim_no, title, category, amount, expense_date, status, approved_at, paid_at, created_by")
      .gte("expense_date", monthStartBangkok(-5))
      .order("expense_date", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error("โหลดข้อมูลไม่สำเร็จ", { description: error.message });
          setClaims([]);
        } else setClaims((data ?? []).map((c) => ({ ...c, amount: Number(c.amount) })));
      });
  }, []);

  const stats = useMemo(() => {
    if (!claims) return null;
    const monthStart = monthStartBangkok(0);
    const pending = claims.filter((c) => c.status === "SUBMITTED");
    const outstanding = claims.filter((c) => c.status === "APPROVED");
    const approvedThisMonth = claims.filter((c) => ["APPROVED", "PAID"].includes(c.status) && c.expense_date >= monthStart);
    const paidThisMonth = claims.filter((c) => c.status === "PAID" && c.expense_date >= monthStart);

    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) months[monthStartBangkok(-i).slice(0, 7)] = 0;
    for (const c of claims) {
      if (!["APPROVED", "PAID"].includes(c.status)) continue;
      const key = c.expense_date.slice(0, 7);
      if (key in months) months[key] += c.amount;
    }
    return {
      pendingCount: pending.length,
      outstanding: outstanding.reduce((s, c) => s + c.amount, 0),
      approvedCount: approvedThisMonth.length,
      paidTotal: paidThisMonth.reduce((s, c) => s + c.amount, 0),
      chart: Object.entries(months).map(([k, v]) => ({ month: monthLabelTh(k), amount: v })),
      pendingList: pending.slice(0, 6),
    };
  }, [claims]);

  return (
    <>
      <PageHeader th="ภาพรวม" en="Dashboard" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 row-stagger">
        <KpiCard th="รออนุมัติ" en="Pending approval" icon={Clock3} tone="amber" value={stats?.pendingCount} unit="รายการ" loading={!stats} />
        <KpiCard th="ยอดค้างจ่าย" en="Outstanding" icon={Wallet} tone="emerald" value={stats?.outstanding} money loading={!stats} />
        <KpiCard th="อนุมัติเดือนนี้" en="Approved this month" icon={BadgeCheck} tone="sky" value={stats?.approvedCount} unit="รายการ" loading={!stats} />
        <KpiCard th="ยอดจ่ายเดือนนี้" en="Paid this month" icon={Banknote} tone="slate" value={stats?.paidTotal} money loading={!stats} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="card p-6 lg:col-span-3 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-bold text-slate-900">ยอดอนุมัติรายเดือน</h2>
              <p className="text-xs uppercase tracking-wider text-slate-400">Approved amount · last 6 months</p>
            </div>
          </div>
          <div className="h-72">
            {!stats ? (
              <div className="flex h-full items-end gap-4 px-4 pb-6">
                {[45, 70, 55, 85, 60, 75].map((h, i) => (
                  <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px -12px rgba(15,23,42,.2)", fontFamily: "inherit" }}
                    formatter={(v) => [formatBaht(Number(v)), "ยอดอนุมัติ"]}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={48} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card lg:col-span-2 animate-fade-up overflow-hidden" style={{ animationDelay: "260ms" }}>
          <div className="flex items-end justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="font-bold text-slate-900">รายการรออนุมัติ</h2>
              <p className="text-xs uppercase tracking-wider text-slate-400">Pending claims</p>
            </div>
            <Link href="/claims?status=SUBMITTED" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 cursor-pointer">
              ดูทั้งหมด <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {!stats ? (
            <ul className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-6 py-3.5">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </li>
              ))}
            </ul>
          ) : stats.pendingList.length === 0 ? (
            <EmptyState icon={<Inbox className="h-7 w-7" />} title="ไม่มีรายการรออนุมัติ" hint={profile.role === "admin" ? "ทุกรายการได้รับการตรวจสอบแล้ว" : "รายการที่ส่งแล้วจะแสดงที่นี่"} />
          ) : (
            <ul className="divide-y divide-slate-100 row-stagger">
              {stats.pendingList.map((c) => (
                <li key={c.id}>
                  <Link href={`/claims/${c.id}`} className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-emerald-50/60 cursor-pointer">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                      <Clock3 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{c.title}</p>
                      <p className="text-xs text-slate-400">
                        {c.claim_no} · {categoryLabel(c.category)} · {formatDate(c.expense_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{formatBaht(c.amount)}</p>
                      <StatusBadge status={c.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

const TONES = {
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  sky: "bg-sky-50 text-sky-600 ring-sky-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

function KpiCard({
  th, en, icon: Icon, tone, value, unit, money, loading,
}: {
  th: string; en: string; icon: ComponentType<{ className?: string }>; tone: keyof typeof TONES;
  value?: number; unit?: string; money?: boolean; loading: boolean;
}) {
  const n = useCountUp(value ?? 0);
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{th}</p>
          <p className="text-[11px] uppercase tracking-wider text-slate-400">{en}</p>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ${TONES[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-4 min-h-[36px]">
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-3xl">
            {money ? formatBaht(n) : Math.round(n).toLocaleString("en-US")}
            {unit && <span className="ml-1.5 text-sm font-medium text-slate-400">{unit}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
