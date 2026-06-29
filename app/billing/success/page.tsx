"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Crown, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Suspense } from "react";

function SuccessContent() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan") ?? "pro";
  const isPro = plan === "pro";

  useEffect(() => {
    const stored = localStorage.getItem("tl_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        localStorage.setItem("tl_user", JSON.stringify({ ...u, plan }));
      } catch {}
    }
  }, [plan]);

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className={`bg-[#1e293b] rounded-2xl border p-10 text-center max-w-sm w-full ${isPro ? "border-indigo-500/30" : "border-blue-500/30"}`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gradient-to-br ${isPro ? "from-indigo-500 to-purple-500" : "from-blue-500 to-cyan-500"}`}>
          {isPro ? <Crown size={32} className="text-white" /> : <Star size={32} className="text-white" />}
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Welcome to {isPro ? "Pro" : "Basic"}!
        </h1>
        <p className="text-white/50 mb-6">
          {isPro
            ? "Your subscription is active. Enjoy unlimited trips, all AI features, drive storage, and more."
            : "Your subscription is active. Enjoy unlimited trips, AI packing & budget insights, and more."}
        </p>
        <Button className="w-full justify-center" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
