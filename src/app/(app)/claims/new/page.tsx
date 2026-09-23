import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClaimForm } from "@/components/claim-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "สร้างรายการเบิกจ่าย" };

export default async function NewClaimPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/claims" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-emerald-700 cursor-pointer">
        <ChevronLeft className="h-4 w-4" /> กลับไปรายการเบิกจ่าย
      </Link>
      <PageHeader th="สร้างรายการเบิกจ่าย" en="New expense claim" />
      <ClaimForm userId={user!.id} />
    </div>
  );
}
