"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function BillingSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Update plan in localStorage if present
    const stored = localStorage.getItem("tl_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        localStorage.setItem("tl_user", JSON.stringify({ ...u, plan: "pro" }));
      } catch {}
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl border border-indigo-500/30 p-10 text-center max-w-sm w-full">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Crown size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Welcome to Pro!</h1>
        <p className="text-white/50 mb-6">Your subscription is active. Enjoy unlimited trips, AI features, and more.</p>
        <Button className="w-full justify-center" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
