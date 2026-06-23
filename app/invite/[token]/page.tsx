"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plane, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user, loading: authLoading, login, register } = useAuth();

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  // Auth form state (shown when not logged in)
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch(`${BASE}/api/trips/x/members/invite/${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Invite not found or expired"));
  }, [token]);

  async function accept() {
    setAccepting(true);
    try {
      const authToken = localStorage.getItem("tl_token");
      if (!data?.trip?.id) throw new Error("Invalid invite data");
      const aRes = await fetch(`${BASE}/api/trips/${data.trip.id}/members/invite/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      });
      const r = await aRes.json();
      if (r.error) throw new Error(r.error);
      router.push(`/trips/${r.tripId}`);
    } catch (e: any) {
      setError(e.message);
      setAccepting(false);
    }
  }

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);
    try {
      if (authMode === "login") await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      // After auth, accept will be triggered by user clicking the button
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  }

  if (authLoading || !data) {
    if (error) return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <p className="text-red-500">{error}</p>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>Go Home</Button>
        </div>
      </div>
    );
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const trip = data.trip;
  const fmt = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        {/* Trip invite card */}
        <div className="text-center mb-6">
          <div className="bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"><Plane size={28} /></div>
          <h1 className="text-xl font-bold text-gray-900">You're invited!</h1>
          <p className="text-2xl font-bold text-indigo-600 mt-2">{trip.title}</p>
          <p className="text-gray-500 text-sm mt-1">📍 {trip.destination}</p>
          {trip.start_date && <p className="text-gray-400 text-xs mt-1">{fmt(trip.start_date)} – {fmt(trip.end_date)}</p>}
        </div>

        {error && <p className="text-sm text-red-600 text-center mb-4">{error}</p>}

        {user ? (
          // Logged in — show accept button
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center">Signed in as <span className="font-medium text-gray-800">{user.email}</span></p>
            <Button className="w-full justify-center" onClick={accept} disabled={accepting}>
              {accepting ? "Joining..." : "Accept & Join Trip"}
            </Button>
          </div>
        ) : (
          // Not logged in — show auth form with context
          <div>
            <p className="text-sm text-gray-500 text-center mb-4">
              {authMode === "register" ? "Create a free account to join" : "Sign in to accept the invite"}
            </p>
            <form onSubmit={submitAuth} className="space-y-3">
              {authMode === "register" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Full name</label>
                  <input className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={form.name} onChange={e => set("name", e.target.value)} required placeholder="Your name" />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Email</label>
                <input type="email" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={form.email} onChange={e => set("email", e.target.value)} required placeholder="you@example.com" />
              </div>
              <div className="relative flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Password</label>
                <input type={showPass ? "text" : "password"} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pr-10" value={form.password} onChange={e => set("password", e.target.value)} required placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-8 text-gray-400">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              {authError && <p className="text-sm text-red-600">{authError}</p>}
              <Button type="submit" className="w-full justify-center" disabled={authSubmitting}>
                {authSubmitting ? "..." : authMode === "register" ? "Create Account & Join" : "Sign In & Join"}
              </Button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-4">
              {authMode === "register" ? "Already have an account? " : "New here? "}
              <button onClick={() => { setAuthMode(m => m === "login" ? "register" : "login"); setAuthError(""); }} className="text-indigo-600 font-medium hover:underline">
                {authMode === "register" ? "Sign in" : "Create account"}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
