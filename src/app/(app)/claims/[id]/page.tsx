import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClaimDetail } from "@/components/claim-detail";
import { TABLES, type Claim } from "@/lib/types";

export const metadata = { title: "รายละเอียดรายการเบิกจ่าย" };

type ClaimWithOwner = Claim & { owner: { full_name: string } | { full_name: string }[] | null };

export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from(TABLES.claims)
    .select("*, owner:expense_claim_approval_hzta_profiles!expense_claim_approval_hzta_claims_owner_fkey(full_name)")
    .eq("id", id)
    .maybeSingle<ClaimWithOwner>();

  if (!data) notFound();
  const owner = Array.isArray(data.owner) ? data.owner[0] ?? null : data.owner;
  const claim: Claim = { ...data, amount: Number(data.amount) };

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/claims" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-emerald-700 cursor-pointer">
        <ChevronLeft className="h-4 w-4" /> กลับไปรายการเบิกจ่าย
      </Link>
      <ClaimDetail claim={claim} ownerName={owner?.full_name ?? "-"} userId={user!.id} />
    </div>
  );
}
