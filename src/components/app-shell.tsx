"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Receipt,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { Modal, Spinner } from "@/components/ui";

const ProfileContext = createContext<Profile | null>(null);
export const useProfile = () => {
  const p = useContext(ProfileContext);
  if (!p) throw new Error("useProfile outside AppShell");
  return p;
};

const NAV = [
  { href: "/", th: "ภาพรวม", en: "Dashboard", icon: LayoutDashboard },
  { href: "/claims", th: "รายการเบิกจ่าย", en: "Claims", icon: Receipt },
  { href: "/claims/new", th: "สร้างรายการใหม่", en: "New claim", icon: PlusCircle },
];

export function AppShell({ profile, email, children }: { profile: Profile; email: string; children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync persisted preference after hydration
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem("sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || (href === "/claims" && pathname.startsWith("/claims/") && pathname !== "/claims/new"));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className={`flex h-16 items-center gap-3 border-b border-slate-800/60 px-4 ${collapsed ? "justify-center" : ""}`}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
          <FileCheck2 className="h-5 w-5" />
        </span>
        {!collapsed && (
          <div className="min-w-0 animate-fade-in">
            <p className="truncate text-sm font-bold text-white">ระบบอนุมัติค่าใช้จ่าย</p>
            <p className="truncate text-[10px] uppercase tracking-widest text-slate-400">Expense Claims</p>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ href, th, en, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? th : undefined}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 cursor-pointer ${
                active ? "bg-emerald-500/15 text-white ring-1 ring-emerald-500/30" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon className={`h-5 w-5 shrink-0 transition-colors ${active ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-300"}`} />
              {!collapsed && (
                <span className="min-w-0 leading-tight">
                  <span className="block text-sm font-medium">{th}</span>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-500 group-hover:text-slate-400">{en}</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className={`border-t border-slate-800/60 p-3 ${collapsed ? "text-center" : ""}`}>
        <div className={`flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2 text-xs text-slate-300 ${collapsed ? "justify-center" : ""}`}>
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          {!collapsed && <span>{profile.role === "admin" ? "ผู้ดูแลระบบ" : "พนักงาน"}</span>}
        </div>
        <button
          onClick={toggle}
          className="mt-2 hidden w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-white cursor-pointer lg:flex"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && "ย่อเมนู"}
        </button>
      </div>
    </div>
  );

  return (
    <ProfileContext.Provider value={profile}>
      <div className="flex min-h-screen">
        <aside
          className={`hidden lg:block sticky top-0 h-screen shrink-0 bg-slate-900 transition-[width] duration-300 ease-in-out ${
            collapsed ? "w-[76px]" : "w-64"
          }`}
        >
          {sidebar}
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 bg-slate-900 shadow-2xl animate-fade-in">
              <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer" aria-label="ปิดเมนู">
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-6">
            <button onClick={() => setMobileOpen(true)} className="btn-ghost -ml-2 p-2 lg:hidden" aria-label="เปิดเมนู">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-500">
                สวัสดี, <span className="font-semibold text-slate-800">{profile.full_name}</span>
              </p>
            </div>
            <Link href="/claims/new" className="btn-primary hidden sm:inline-flex py-2">
              <PlusCircle className="h-4 w-4" />
              สร้างรายการ
            </Link>
            <UserMenu profile={profile} email={email} />
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </ProfileContext.Provider>
  );
}

function UserMenu({ profile, email }: { profile: Profile; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("ออกจากระบบแล้ว");
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-slate-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-bold text-white shadow-sm ring-2 ring-white">
          {initials(profile.full_name)}
        </span>
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-700 md:block">{profile.full_name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-scale-in" role="menu">
          <div className="flex items-center gap-3 px-3 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{profile.full_name}</p>
              <p className="truncate text-xs text-slate-400">{email}</p>
              <p className="mt-0.5 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
                {profile.role}
              </p>
            </div>
          </div>
          <div className="my-1 h-px bg-slate-100" />
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setPwOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer"
          >
            <KeyRound className="h-4 w-4 text-slate-400" />
            <span>
              เปลี่ยนรหัสผ่าน <span className="ml-1 text-xs text-slate-400">Change password</span>
            </span>
          </button>
          <button
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>
              ออกจากระบบ <span className="ml-1 text-xs text-rose-400">Logout</span>
            </span>
          </button>
        </div>
      )}

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    if (pw !== confirm) return toast.error("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error("เปลี่ยนรหัสผ่านไม่สำเร็จ", { description: error.message });
    toast.success("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
    setPw("");
    setConfirm("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="เปลี่ยนรหัสผ่าน"
      subtitle="Change password"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            ยกเลิก
          </button>
          <button type="submit" form="change-password-form" disabled={loading} className="btn-primary">
            {loading && <Spinner />}
            บันทึกรหัสผ่านใหม่
          </button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="new-pw">รหัสผ่านใหม่</label>
          <input id="new-pw" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required minLength={8} />
        </div>
        <div>
          <label className="label" htmlFor="confirm-pw">ยืนยันรหัสผ่านใหม่</label>
          <input id="confirm-pw" type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required minLength={8} />
        </div>
        <p className="text-xs text-slate-400">อย่างน้อย 8 ตัวอักษร แนะนำให้ผสมตัวอักษร ตัวเลข และสัญลักษณ์</p>
      </form>
    </Modal>
  );
}
