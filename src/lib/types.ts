export type Role = "admin" | "staff";
export type Category = "travel" | "entertainment" | "office" | "phone" | "other";
export type Status = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "PAID";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
}

export interface Claim {
  id: string;
  claim_no: string;
  title: string;
  category: Category;
  amount: number;
  expense_date: string;
  description: string;
  receipt_no: string | null;
  status: Status;
  reject_reason: string | null;
  created_by: string;
  approved_by: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export const TABLES = {
  claims: "expense_claim_approval_hzta_claims",
  profiles: "expense_claim_approval_hzta_profiles",
} as const;

export const LOGIN_EMAIL_DOMAIN = "expenseclaim.dev";

export const CATEGORIES: { value: Category; th: string; en: string }[] = [
  { value: "travel", th: "ค่าเดินทาง", en: "Travel" },
  { value: "entertainment", th: "ค่ารับรอง", en: "Entertainment" },
  { value: "office", th: "ค่าใช้จ่ายสำนักงาน", en: "Office" },
  { value: "phone", th: "ค่าโทรศัพท์", en: "Phone" },
  { value: "other", th: "อื่นๆ", en: "Other" },
];

export const STATUSES: { value: Status; th: string; en: string; badge: string; dot: string }[] = [
  { value: "DRAFT", th: "ฉบับร่าง", en: "Draft", badge: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
  { value: "SUBMITTED", th: "รออนุมัติ", en: "Submitted", badge: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-400" },
  { value: "APPROVED", th: "อนุมัติแล้ว", en: "Approved", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  { value: "REJECTED", th: "ไม่อนุมัติ", en: "Rejected", badge: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  { value: "PAID", th: "จ่ายแล้ว", en: "Paid", badge: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
];

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.value === c)?.th ?? c;
export const statusMeta = (s: Status) => STATUSES.find((x) => x.value === s) ?? STATUSES[0];
