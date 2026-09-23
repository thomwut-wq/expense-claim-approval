"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote, CalendarDays, Check, FileText, Pencil, Receipt, Send, Tag, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatBaht, formatDate, formatDateTime } from "@/lib/format";
import { TABLES, categoryLabel, type Claim } from "@/lib/types";
import { useProfile } from "@/components/app-shell";
import { ClaimForm } from "@/components/claim-form";
import { Modal, PageHeader, Spinner, StatusBadge } from "@/components/ui";

type Action = "submit" | "approve" | "reject" | "pay" | "delete";

export function ClaimDetail({ claim, ownerName, userId }: { claim: Claim; ownerName: string; userId: string }) {
  const profile = useProfile();
  const router = useRouter();
  const isAdmin = profile.role === "admin";
  const isOwner = claim.created_by === userId;

  const [editing, setEditing] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [receipt, setReceipt] = useState(claim.receipt_no ?? "");

  const canEdit = claim.status === "DRAFT" && (isOwner || isAdmin);
  const canSubmit = claim.status === "DRAFT" && isOwner;
  const canDelete = (claim.status === "DRAFT" && isOwner) || (isAdmin && claim.status !== "PAID");
  const canApprove = isAdmin && claim.status === "SUBMITTED";
  const canPay = isAdmin && claim.status === "APPROVED";

  if (editing) {
    return (
      <>
        <PageHeader th={`แก้ไข ${claim.claim_no}`} en="Edit claim" />
        <ClaimForm claim={claim} userId={userId} onDone={() => setEditing(false)} />
        <button onClick={() => setEditing(false)} className="btn-ghost mt-3">
          <X className="h-4 w-4" /> ปิดโหมดแก้ไข
        </button>
      </>
    );
  }

  async function run() {
    if (!action) return;
    const supabase = createClient();
    const now = new Date().toISOString();
    let patch: Partial<Claim> = {};
    let success = "";
    switch (action) {
      case "submit":
        patch = { status: "SUBMITTED", submitted_at: now };
        success = "ส่งคำขออนุมัติเรียบร้อยแล้ว";
        break;
      case "approve":
        patch = { status: "APPROVED", approved_at: now, approved_by: userId, reject_reason: null };
        success = "อนุมัติรายการแล้ว";
        break;
      case "reject":
        if (reason.trim().length < 3) return toast.error("กรุณาระบุเหตุผลที่ไม่อนุมัติ");
        patch = { status: "REJECTED", approved_at: now, approved_by: userId, reject_reason: reason.trim() };
        success = "บันทึกการไม่อนุมัติแล้ว";
        break;
      case "pay":
        if (!receipt.trim()) return toast.error("กรุณาระบุเลขที่ใบเสร็จก่อนบันทึกการจ่าย");
        patch = { status: "PAID", paid_at: now, receipt_no: receipt.trim() };
        success = "บันทึกการจ่ายเงินแล้ว";
        break;
      case "delete":
        patch = { is_deleted: true };
        success = "ลบรายการแล้ว";
        break;
    }
    setBusy(true);
    const { error } =
      action === "delete"
        ? await supabase.rpc("expense_claim_approval_hzta_soft_delete", { p_id: claim.id })
        : await supabase.from(TABLES.claims).update(patch).eq("id", claim.id);
    setBusy(false);
    if (error) return toast.error("ดำเนินการไม่สำเร็จ", { description: error.message });
    toast.success(success);
    setAction(null);
    if (action === "delete") router.push("/claims");
    router.refresh();
  }

  const MODAL: Record<Action, { title: string; subtitle: string; body: React.ReactNode; confirm: string; danger?: boolean }> = {
    submit: { title: "ส่งคำขออนุมัติ", subtitle: "Submit for approval", body: <p className="text-sm text-slate-600">เมื่อส่งแล้วจะไม่สามารถแก้ไขรายการนี้ได้ ต้องการส่ง <b>{claim.claim_no}</b> เพื่อรออนุมัติหรือไม่?</p>, confirm: "ยืนยันส่งอนุมัติ" },
    approve: { title: "อนุมัติรายการ", subtitle: "Approve claim", body: <p className="text-sm text-slate-600">ยืนยันอนุมัติ <b>{claim.claim_no}</b> จำนวน <b>{formatBaht(claim.amount)}</b> ของ {ownerName}?</p>, confirm: "ยืนยันอนุมัติ" },
    reject: {
      title: "ไม่อนุมัติรายการ",
      subtitle: "Reject claim",
      body: (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">กรุณาระบุเหตุผลเพื่อแจ้งให้ผู้เบิกทราบ</p>
          <textarea className="input min-h-[96px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ไม่มีใบเสร็จรับเงินฉบับจริง" autoFocus />
        </div>
      ),
      confirm: "ยืนยันไม่อนุมัติ",
      danger: true,
    },
    pay: {
      title: "บันทึกการจ่ายเงิน",
      subtitle: "Mark as paid",
      body: (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">ระบุเลขที่ใบเสร็จ/หลักฐานการจ่ายสำหรับ <b>{claim.claim_no}</b> จำนวน <b>{formatBaht(claim.amount)}</b></p>
          <input className="input" value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="RC-XXXX-XXXX" autoFocus />
        </div>
      ),
      confirm: "ยืนยันจ่ายแล้ว",
    },
    delete: { title: "ลบรายการ", subtitle: "Delete claim", body: <p className="text-sm text-slate-600">ต้องการลบ <b>{claim.claim_no}</b> หรือไม่? รายการจะถูกซ่อนจากระบบ</p>, confirm: "ยืนยันลบ", danger: true },
  };

  return (
    <>
      <PageHeader th={claim.claim_no} en={`Created ${formatDateTime(claim.created_at)}`}>
        <StatusBadge status={claim.status} size="md" />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2 animate-fade-up">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-900">{claim.title}</h2>
            <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-700">{formatBaht(claim.amount)}</p>
          </div>
          <dl className="grid gap-x-6 gap-y-5 p-6 sm:grid-cols-2">
            <Field icon={Tag} label="หมวดหมู่" value={categoryLabel(claim.category)} />
            <Field icon={CalendarDays} label="วันที่ใช้จ่าย" value={formatDate(claim.expense_date)} />
            <Field icon={UserRound} label="ผู้เบิก" value={ownerName} />
            <Field icon={Receipt} label="เลขที่ใบเสร็จ" value={claim.receipt_no ?? "-"} />
            <div className="sm:col-span-2">
              <Field icon={FileText} label="รายละเอียด" value={claim.description || "-"} />
            </div>
          </dl>
          {claim.status === "REJECTED" && claim.reject_reason && (
            <div className="mx-6 mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 animate-fade-in">
              <p className="font-semibold">เหตุผลที่ไม่อนุมัติ</p>
              <p className="mt-1">{claim.reject_reason}</p>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="card p-5 animate-fade-up" style={{ animationDelay: "80ms" }}>
            <h3 className="font-bold text-slate-900">การดำเนินการ</h3>
            <p className="mb-4 text-xs uppercase tracking-wider text-slate-400">Actions</p>
            <div className="flex flex-col gap-2">
              {canApprove && (
                <>
                  <button onClick={() => setAction("approve")} className="btn-primary w-full">
                    <Check className="h-4 w-4" /> อนุมัติ
                  </button>
                  <button onClick={() => setAction("reject")} className="btn-danger w-full">
                    <X className="h-4 w-4" /> ไม่อนุมัติ
                  </button>
                </>
              )}
              {canPay && (
                <button onClick={() => setAction("pay")} className="btn-primary w-full bg-sky-600 hover:bg-sky-700">
                  <Banknote className="h-4 w-4" /> บันทึกจ่ายแล้ว
                </button>
              )}
              {canSubmit && (
                <button onClick={() => setAction("submit")} className="btn-primary w-full">
                  <Send className="h-4 w-4" /> ส่งอนุมัติ
                </button>
              )}
              {canEdit && (
                <button onClick={() => setEditing(true)} className="btn-secondary w-full">
                  <Pencil className="h-4 w-4" /> แก้ไขรายการ
                </button>
              )}
              {canDelete && (
                <button onClick={() => setAction("delete")} className="btn-ghost w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                  <Trash2 className="h-4 w-4" /> ลบรายการ
                </button>
              )}
              {!canApprove && !canPay && !canSubmit && !canEdit && !canDelete && (
                <p className="rounded-lg bg-slate-50 p-3 text-center text-sm text-slate-400">ไม่มีการดำเนินการสำหรับสถานะนี้</p>
              )}
            </div>
          </section>

          <section className="card p-5 animate-fade-up" style={{ animationDelay: "140ms" }}>
            <h3 className="font-bold text-slate-900">ไทม์ไลน์</h3>
            <p className="mb-4 text-xs uppercase tracking-wider text-slate-400">Timeline</p>
            <ol className="relative space-y-4 border-l-2 border-slate-100 pl-5">
              <Step done label="สร้างรายการ" at={claim.created_at} />
              <Step done={!!claim.submitted_at} label="ส่งอนุมัติ" at={claim.submitted_at} />
              <Step done={!!claim.approved_at} label={claim.status === "REJECTED" ? "ไม่อนุมัติ" : "อนุมัติ"} at={claim.approved_at} tone={claim.status === "REJECTED" ? "rose" : "emerald"} />
              {claim.status !== "REJECTED" && <Step done={!!claim.paid_at} label="จ่ายเงิน" at={claim.paid_at} tone="sky" />}
            </ol>
          </section>
        </aside>
      </div>

      {action && (
        <Modal
          open
          onClose={() => !busy && setAction(null)}
          title={MODAL[action].title}
          subtitle={MODAL[action].subtitle}
          footer={
            <>
              <button onClick={() => setAction(null)} className="btn-secondary" disabled={busy}>
                ยกเลิก
              </button>
              <button onClick={run} className={MODAL[action].danger ? "btn-danger" : "btn-primary"} disabled={busy}>
                {busy && <Spinner />}
                {MODAL[action].confirm}
              </button>
            </>
          }
        >
          {MODAL[action].body}
        </Modal>
      )}
    </>
  );
}

function Field({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-400">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium text-slate-800 whitespace-pre-wrap break-words">{value}</dd>
      </div>
    </div>
  );
}

function Step({ done, label, at, tone = "emerald" }: { done: boolean; label: string; at: string | null; tone?: "emerald" | "rose" | "sky" }) {
  const dot = { emerald: "bg-emerald-500 ring-emerald-100", rose: "bg-rose-500 ring-rose-100", sky: "bg-sky-500 ring-sky-100" }[tone];
  return (
    <li className="relative">
      <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ${done ? dot : "bg-slate-200 ring-white"}`} />
      <p className={`text-sm font-medium ${done ? "text-slate-800" : "text-slate-400"}`}>{label}</p>
      <p className="text-xs text-slate-400">{done ? formatDateTime(at) : "รอดำเนินการ"}</p>
    </li>
  );
}
