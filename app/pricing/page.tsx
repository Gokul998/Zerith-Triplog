"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Zap, Crown, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

const FREE_FEATURES = [
  "Up to 3 trips",
  "Up to 2 members per trip",
  "Itinerary & checklist",
  "Expense tracking",
  "Trip chat",
];

const PRO_FEATURES = [
  "Unlimited trips",
  "Unlimited members per trip",
  "AI packing suggestions",
  "AI budget insights",
  "AI trip story & destination guide",
  "Receipt scanner (AI)",
  "Drive file uploads",
  "AI chat assistant",
  "Priority support",
];

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("tl_token");
    fetch(`${BASE}/api/billing/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setStatus);
  }, [user]);

  async function handleUpgrade(provider: "razorpay" | "stripe") {
    if (!user) { router.push("/auth/login"); return; }
    setLoading(true);
    setError("");
    const token = localStorage.getItem("tl_token");

    try {
      if (provider === "razorpay") {
        const { order_id, amount } = await fetch(`${BASE}/api/billing/razorpay/order`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        }).then(r => r.json());

        const options = {
          key: status?.razorpay_key,
          amount,
          currency: "INR",
          name: "TripLog Pro",
          description: "Monthly subscription",
          order_id,
          handler: async (response: any) => {
            const res = await fetch(`${BASE}/api/billing/razorpay/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify(response),
            }).then(r => r.json());
            if (res.ok) {
              // Update local user plan
              const stored = localStorage.getItem("tl_user");
              if (stored) {
                const u = JSON.parse(stored);
                localStorage.setItem("tl_user", JSON.stringify({ ...u, plan: "pro" }));
              }
              router.push("/dashboard?upgraded=1");
            } else {
              setError("Payment verification failed. Please contact support.");
            }
          },
          prefill: { email: user.email, name: (user as any).name },
          theme: { color: "#6366f1" },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        const { url } = await fetch(`${BASE}/api/billing/stripe/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        }).then(r => r.json());
        window.location.href = url;
      }
    } catch (e: any) {
      setError(e.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  const isPro = status?.plan === "pro";
  const isTrial = status?.plan === "trial";
  const trialDays = status?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(status.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <>
      {/* Load Razorpay SDK */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      <div className="min-h-screen bg-[#0f172a] py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-3">Simple, honest pricing</h1>
            <p className="text-white/50 text-lg">Start free. Upgrade when you need more.</p>
            {isTrial && trialDays > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-sm">
                <Clock size={14} />
                Your Pro trial ends in {trialDays} day{trialDays !== 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="bg-[#1e293b] rounded-2xl border border-white/10 p-8">
              <div className="flex items-center gap-3 mb-2">
                <Zap size={22} className="text-white/40" />
                <h2 className="text-xl font-bold text-white">Free</h2>
              </div>
              <p className="text-white/40 text-sm mb-6">Perfect for solo travellers</p>
              <div className="mb-8">
                <span className="text-4xl font-bold text-white">₹0</span>
                <span className="text-white/40 ml-2">/ month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                    <Check size={14} className="text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {!user ? (
                <Button variant="secondary" className="w-full justify-center" onClick={() => router.push("/auth/register")}>
                  Get started free
                </Button>
              ) : (
                <div className="w-full text-center text-white/30 text-sm py-3 border border-white/10 rounded-xl">
                  {isPro ? "Previous plan" : "Current plan"}
                </div>
              )}
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-b from-indigo-600/20 to-purple-600/10 rounded-2xl border border-indigo-500/30 p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                MOST POPULAR
              </div>
              <div className="flex items-center gap-3 mb-2">
                <Crown size={22} className="text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Pro</h2>
              </div>
              <p className="text-white/40 text-sm mb-6">For groups and frequent travellers</p>

              {/* Pricing split */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-white/40 mb-1">India</p>
                  <p className="text-2xl font-bold text-white">₹299</p>
                  <p className="text-xs text-white/30">/ month</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-white/40 mb-1">International</p>
                  <p className="text-2xl font-bold text-white">$4.99</p>
                  <p className="text-xs text-white/30">/ month</p>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/80">
                    <Check size={14} className="text-indigo-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

              {isPro ? (
                <div className="w-full text-center text-indigo-400 text-sm py-3 border border-indigo-500/30 rounded-xl font-medium">
                  ✓ You're on Pro
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    className="w-full justify-center bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500"
                    disabled={loading}
                    onClick={() => handleUpgrade("razorpay")}
                  >
                    {loading ? "Opening..." : "Pay with UPI / Cards (India)"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-center"
                    disabled={loading}
                    onClick={() => handleUpgrade("stripe")}
                  >
                    {loading ? "Opening..." : "Pay with Card (International)"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Trial note */}
          <p className="text-center text-white/30 text-sm mt-8">
            New accounts get a 14-day Pro trial — no credit card required.
          </p>
        </div>
      </div>
    </>
  );
}
