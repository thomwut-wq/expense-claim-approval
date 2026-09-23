import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <FileQuestion className="h-8 w-8" />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">ไม่พบหน้าที่ต้องการ</h1>
      <p className="mt-1 text-xs uppercase tracking-widest text-slate-400">Page not found</p>
      <Link href="/" className="btn-primary mt-6">กลับหน้าภาพรวม</Link>
    </main>
  );
}
