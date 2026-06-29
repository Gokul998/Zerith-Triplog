"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Zap, Star, Crown, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

const FEATURES: { label: string; free: boolean; basic: boolean; pro: boolean }[] = [
  { label: "Up to 3 trips",              free: true,  basic: false, pro: false },
  { label: "Unlimited trips",            free: false, basic: true,  pro: true  },
  { label: "Up to 2 members / trip",     free: true,  basic: false, pro: false },
  { label: "Up to 5 members / trip",     free: false, basic: true,  pro: false },
  { label: "Unlimited members / trip",   free: false, basic: false, pro: true  },
  { label: "Itinerary & checklist",      free: true,  basic: true,  pro: true  },
  { label: "Expense tracking & split",   free: true,  basic: true,  pro: true  },
  { label: "Trip chat",                  free: true,  basic: true,  pro: true  },
  { label: "AI packing suggestions",     free: false, basic: true,  pro: true  },
  { label: "AI budget insights",         free: false, basic: true,  pro: true  },
  { label: "AI trip story & guide",      free: false, basic: false, pro: true  },
  { label: "AI chat assistant",          free: false, basic: false, pro: true  },
  { label: "Receipt scanner (AI)",       free: false, basic: false, pro: true  },
  { label: "Drive file uploads",         free: false, basic: false, pro: true  },
];

type PlanKey = "basic" | "pro";

const PLANS = {
  basic: { inr: 150, usd: 1.99, label: "Basic", icon: Star,  color: "from-blue-500 to-cyan-500",    border: "border-blue-500/30",  badge: "bg-blue-500/10 text-blue-400"  },
  pro:   { inr: 500, usd: 5.99, label: "Pro",   icon: Crown, color: "from-indigo-500 to-purple-600", border: "border-indigo-500/30", badge: "bg-indigo-500/10 text-indigo-400" },
};

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("tl_token");
    fetch(`${BASE}/api/billing/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setStatus);
  }, [user]);

  async function handleUpgrade(planKey: PlanKey, provider: "razorpay" | "stripe") {
    if (!user) { router.push("/auth/login"); return; }
    setLoading(planKey);
    setError("");
    const token = localStorage.getItem("tl_token");
    try {
      if (provider === "razorpay") {
        const data = await fetch(`${BASE}/api/billing/razorpay/order`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan: planKey }),
        }).then(r => r.json());

        const options = {
          key: status?.razorpay_key,
          amount: data.amount,
          currency: "INR",
          name: `TripLog ${PLANS[planKey].label}`,
          description: "Monthly subscription",
          order_id: data.order_id,
          handler: async (response: any) => {
            const res = await fetch(`${BASE}/api/billing/razorpay/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify(response),
            }).then(r => r.json());
            if (res.ok) {
              const stored = localStorage.getItem("tl_user");
              if (stored) localStorage.setItem("tl_user", JSON.stringify({ ...JSON.parse(stored), plan: planKey }));
              router.push(`/billing/success?plan=${planKey}`);
            } else {
              setError("Payment verification failed. Contact support.");
            }
            setLoading(null);
          },
          prefill: { email: user.email },
          theme: { color: planKey === "pro" ? "#6366f1" : "#3b82f6" },
          modal: { ondismiss: () => setLoading(null) },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        const { url } = await fetch(`${BASE}/api/billing/stripe/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan: planKey }),
        }).then(r => r.json());
        window.location.href = url;
      }
    } catch (e: any) {
      setError(e.message || "Payment failed");
      setLoading(null);
    }
  }

  const currentPlan: string = status?.plan ?? ((user as any)?.plan ?? "free");
  const trialDays = status?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(status.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  function PlanButton({ planKey }: { planKey: PlanKey }) {
    const isCurrent = currentPlan === planKey;
    const isHigher = planKey === "pro" && currentPlan === "basic";
    if (isCurrent) return (
      <div className="w-full text-center py-3 rounded-xl border border-white/10 text-white/40 text-sm">✓ Current plan</div>
    );
    return (
      <div className="space-y-2">
        <Button
          className={`w-full justify-center ${planKey === "pro" ? "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500" : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400"}`}
          disabled={loading !== null}
          onClick={() => handleUpgrade(planKey, "razorpay")}
        >
          {loading === planKey ? <Loader2 size={14} className="animate-spin" /> : null}
          {isHigher ? "Upgrade to Pro" : `Get ${PLANS[planKey].label}`} · UPI / Cards (India)
        </Button>
        <Button
          variant="secondary"
          className="w-full justify-center"
          disabled={loading !== null}
          onClick={() => handleUpgrade(planKey, "stripe")}
        >
          {isHigher ? "Upgrade to Pro" : `Get ${PLANS[planKey].label}`} · Card (International)
        </Button>
      </div>
    );
  }

  function Cell({ val }: { val: boolean | string }) {
    if (val === true) return <Check size={16} className="mx-auto text-green-400" />;
    if (val === false) return <X size={16} className="mx-auto text-white/15" />;
    return <span className="text-xs text-white/60">{val}</span>;
  }

  return (
    <>
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      <div className="min-h-screen bg-[#0f172a] py-16 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-3">Simple, honest pricing</h1>
            <p className="text-white/50 text-lg">Start free. Upgrade when you need more.</p>
            {currentPlan === "trial" && trialDays > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-sm">
                <Clock size={14} />
                Pro trial ends in {trialDays} day{trialDays !== 1 ? "s" : ""}
              </div>
            )}
            {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Free */}
            <div className="bg-[#1e293b] rounded-2xl border border-white/10 p-7 flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={20} className="text-white/40" />
                <h2 className="text-lg font-bold text-white">Free</h2>
              </div>
              <p className="text-white/40 text-sm mb-6">Try it out</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-white">₹0</span>
                <span className="text-white/30 text-sm ml-1">/ month</span>
              </div>
              <div className="mt-auto">
                {currentPlan === "free" ? (
                  <div className="w-full text-center py-3 rounded-xl border border-white/10 text-white/40 text-sm">Current plan</div>
                ) : (
                  <div className="w-full text-center py-3 rounded-xl border border-white/10 text-white/30 text-sm">Downgrade</div>
                )}
              </div>
            </div>

            {/* Basic */}
            <div className="bg-[#1e293b] rounded-2xl border border-blue-500/30 p-7 flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <Star size={20} className="text-blue-400" />
                <h2 className="text-lg font-bold text-white">Basic</h2>
              </div>
              <p className="text-white/40 text-sm mb-6">For regular travellers</p>
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="bg-white/5 rounded-xl p-2.5 text-center">
                  <p className="text-xs text-white/30 mb-0.5">India</p>
                  <p className="text-xl font-bold text-white">₹150</p>
                  <p className="text-xs text-white/25">/ month</p>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 text-center">
                  <p className="text-xs text-white/30 mb-0.5">Intl.</p>
                  <p className="text-xl font-bold text-white">$1.99</p>
                  <p className="text-xs text-white/25">/ month</p>
                </div>
              </div>
              <div className="mt-auto"><PlanButton planKey="basic" /></div>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-b from-indigo-600/15 to-purple-600/5 rounded-2xl border border-indigo-500/30 p-7 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                MOST POPULAR
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Crown size={20} className="text-indigo-400" />
                <h2 className="text-lg font-bold text-white">Pro</h2>
              </div>
              <p className="text-white/40 text-sm mb-6">For groups & power users</p>
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="bg-white/5 rounded-xl p-2.5 text-center">
                  <p className="text-xs text-white/30 mb-0.5">India</p>
                  <p className="text-xl font-bold text-white">₹500</p>
                  <p className="text-xs text-white/25">/ month</p>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 text-center">
                  <p className="text-xs text-white/30 mb-0.5">Intl.</p>
                  <p className="text-xl font-bold text-white">$5.99</p>
                  <p className="text-xs text-white/25">/ month</p>
                </div>
              </div>
              <div className="mt-auto"><PlanButton planKey="pro" /></div>
            </div>
          </div>

          {/* Feature comparison table */}
          <div className="bg-[#1e293b] rounded-2xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-4 text-center text-sm font-semibold border-b border-white/10">
              <div className="px-4 py-3 text-left text-white/50">Feature</div>
              <div className="px-4 py-3 text-white/50">Free</div>
              <div className="px-4 py-3 text-blue-400">Basic</div>
              <div className="px-4 py-3 text-indigo-400">Pro</div>
            </div>
            {FEATURES.map((f, i) => (
              <div key={f.label} className={`grid grid-cols-4 text-center text-sm border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                <div className="px-4 py-3 text-left text-white/60">{f.label}</div>
                <div className="px-4 py-3"><Cell val={f.free} /></div>
                <div className="px-4 py-3"><Cell val={f.basic} /></div>
                <div className="px-4 py-3"><Cell val={f.pro} /></div>
              </div>
            ))}
          </div>

          <p className="text-center text-white/25 text-sm mt-8">
            New accounts get a 14-day Pro trial — no credit card required.
          </p>
        </div>
      </div>
    </>
  );
}
