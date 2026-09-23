"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Save, Send } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { todayBangkok } from "@/lib/format";
import { CATEGORIES, TABLES, type Category, type Claim } from "@/lib/types";
import { Spinner } from "@/components/ui";

interface Props {
  claim?: Claim;
  userId: string;
  onDone?: () => void;
}

export function ClaimForm({ claim, userId, onDone }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(claim?.title ?? "");
  const [category, setCategory] = useState<Category>(claim?.category ?? "travel");
  const [amount, setAmount] = useState(claim ? String(claim.amount) : "");
  const [expenseDate, setExpenseDate] = useState(claim?.expense_date ?? todayBangkok());
  const [description, setDescription] = useState(claim?.description ?? "");
  const [receiptNo, setReceiptNo] = useState(claim?.receipt_no ?? "");
  const [saving, setSaving] = useState<null | "DRAFT" | "SUBMITTED">(null);

  async function save(e: FormEvent, status: "DRAFT" | "SUBMITTED") {
    e.preventDefault();
    const amt = Number(amount);
    if (!title.trim()) return toast.error("กรุณาระบุชื่อรายการ");
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("จำนวนเงินต้องมากกว่า 0");
    if (!expenseDate) return toast.error("กรุณาระบุวันที่ใช้จ่าย");

    setSaving(status);
    const supabase = createClient();
    const payload = {
      title: title.trim(),
      category,
      amount: amt,
      expense_date: expenseDate,
      description: description.trim(),
      receipt_no: receiptNo.trim() || null,
      status,
      submitted_at: status === "SUBMITTED" ? new Date().toISOString() : null,
    };

    const res = claim
      ? await supabase.from(TABLES.claims).update(payload).eq("id", claim.id).select("id").single()
      : await supabase.from(TABLES.claims).insert({ ...payload, created_by: userId }).select("id").single();

    setSaving(null);
    if (res.error) {
      toast.error("บันทึกไม่สำเร็จ", { description: res.error.message });
      return;
    }
    toast.success(status === "SUBMITTED" ? "ส่งคำขออนุมัติเรียบร้อยแล้ว" : claim ? "บันทึกการแก้ไขแล้ว" : "บันทึกฉบับร่างแล้ว");
    if (onDone) onDone();
    else router.push(`/claims/${res.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={(e) => save(e, "DRAFT")} className="card animate-fade-up">
      <div className="grid gap-5 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="title">
            ชื่อรายการ <span className="text-rose-500">*</span>
          </label>
          <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น ค่าแท็กซี่ไปประชุมลูกค้า" required maxLength={200} />
        </div>

        <div>
          <label className="label" htmlFor="category">
            หมวดหมู่ <span className="text-rose-500">*</span>
          </label>
          <select id="category" className="input cursor-pointer" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.th} ({c.en})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="amount">
            จำนวนเงิน (บาท) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">฿</span>
            <input
              id="amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              className="input pl-8 tabular-nums"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="expense_date">
            วันที่ใช้จ่าย <span className="text-rose-500">*</span>
          </label>
          <input id="expense_date" type="date" className="input cursor-pointer" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} max={todayBangkok()} required />
        </div>

        <div>
          <label className="label" htmlFor="receipt_no">
            เลขที่ใบเสร็จ <span className="text-xs font-normal text-slate-400">ไม่บังคับ</span>
          </label>
          <input id="receipt_no" className="input" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} placeholder="RC-XXXX-XXXX" maxLength={50} />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">
            รายละเอียด
          </label>
          <textarea
            id="description"
            className="input min-h-[110px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ระบุร้านค้า / ผู้ให้บริการ และเหตุผลในการใช้จ่าย"
            maxLength={1000}
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-end rounded-b-xl">
        <button type="button" onClick={() => (onDone ? onDone() : router.back())} className="btn-secondary" disabled={saving !== null}>
          ยกเลิก
        </button>
        <button type="submit" className="btn-secondary border-emerald-600 text-emerald-700 hover:bg-emerald-50" disabled={saving !== null}>
          {saving === "DRAFT" ? <Spinner /> : <Save className="h-4 w-4" />}
          บันทึกฉบับร่าง
        </button>
        <button type="button" onClick={(e) => save(e, "SUBMITTED")} className="btn-primary" disabled={saving !== null}>
          {saving === "SUBMITTED" ? <Spinner /> : <Send className="h-4 w-4" />}
          บันทึกและส่งอนุมัติ
        </button>
      </div>
    </form>
  );
}
