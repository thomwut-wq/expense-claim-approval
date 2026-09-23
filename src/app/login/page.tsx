"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, FileCheck2, Loader2, LockKeyhole, UserRound } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { LOGIN_EMAIL_DOMAIN } from "@/lib/types";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    const supabase = createClient();
    const email = username.includes("@") ? username.trim() : `${username.trim().toLowerCase()}@${LOGIN_EMAIL_DOMAIN}`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error("เข้าสู่ระบบไม่สำเร็จ", { description: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
      return;
    }
    toast.success("เข้าสู่ระบบสำเร็จ");
    const next = params.get("next");
    router.replace(next && next.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 p-12 text-white">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="relative flex items-center gap-3 animate-fade-in">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <FileCheck2 className="h-6 w-6" />
          </span>
          <div>
            <p className="text-lg font-bold leading-tight">ระบบอนุมัติค่าใช้จ่าย</p>
            <p className="text-xs uppercase tracking-widest text-emerald-200/80">Expense Claim Approval</p>
          </div>
        </div>
        <div className="relative space-y-6 animate-fade-up">
          <h1 className="text-4xl font-bold leading-tight">
            จัดการเบิกจ่าย
            <br />
            ให้เป็นเรื่องง่าย
          </h1>
          <p className="max-w-md text-emerald-100/90 leading-relaxed">
            ยื่นคำขอ ตรวจสอบ และอนุมัติค่าใช้จ่ายของพนักงานได้ครบในที่เดียว พร้อมภาพรวมยอดค้างจ่ายและสถิติรายเดือนแบบเรียลไทม์
          </p>
          <div className="grid grid-cols-3 gap-4 pt-2">
            {[
              ["ค่าเดินทาง", "Travel"],
              ["ค่ารับรอง", "Entertainment"],
              ["ค่าสำนักงาน", "Office"],
            ].map(([th, en]) => (
              <div key={en} className="rounded-xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/15">
                <p className="font-semibold">{th}</p>
                <p className="text-xs text-emerald-200/70">{en}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-emerald-200/60">© {new Date().getFullYear()} Finance Team · Internal use only</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-scale-in">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white">
              <FileCheck2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold leading-tight">ระบบอนุมัติค่าใช้จ่าย</p>
              <p className="text-[11px] uppercase tracking-widest text-slate-400">Expense Claim Approval</p>
            </div>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-bold text-slate-900">เข้าสู่ระบบ</h2>
            <p className="mt-1 text-xs uppercase tracking-wider text-slate-400">Sign in to continue</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="username" className="label">
                  ชื่อผู้ใช้ <span className="text-xs font-normal text-slate-400">Username</span>
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="username"
                    className="input pl-10"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="label">
                  รหัสผ่าน <span className="text-xs font-normal text-slate-400">Password</span>
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={show ? "text" : "password"}
                    className="input pl-10 pr-11"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                    aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                เข้าสู่ระบบ
              </button>
            </form>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            สำหรับพนักงานและทีมการเงินภายในองค์กรเท่านั้น
          </p>
        </div>
      </section>
    </main>
  );
}
