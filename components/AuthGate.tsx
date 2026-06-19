"use client";
import { useState } from "react";
import { Plane, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (loading) return <div className="min-h-screen mesh-bg flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (user) return <>{children}</>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen mesh-bg dot-grid flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated orbs */}
      <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full float-anim-slow pointer-events-none" style={{background: 'radial-gradient(circle, rgba(99,102,241,0.25), transparent)'}} />
      <div className="absolute bottom-[-80px] left-[-60px] w-[300px] h-[300px] rounded-full float-anim pointer-events-none" style={{background: 'radial-gradient(circle, rgba(6,182,212,0.2), transparent)'}} />
      <div className="absolute top-[40%] right-[10%] w-[200px] h-[200px] rounded-full pointer-events-none" style={{background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent)'}} />

      {/* Trail lines */}
      <div className="absolute top-[30%] left-0 right-0 h-px pointer-events-none" style={{background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.2), transparent)'}} />
      <div className="absolute top-[60%] left-[10%] right-0 h-px pointer-events-none" style={{background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.15), transparent)'}} />

      {/* Glass card */}
      <div className="relative z-10 glass-strong rounded-3xl p-8 w-full max-w-sm shadow-[0_0_60px_rgba(99,102,241,0.2)]">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">✈️</div>
          <h1 className="text-3xl font-black gradient-text tracking-tight">TripLog</h1>
          <p className="text-white/40 text-xs uppercase tracking-[3px] mt-1">Your world awaits</p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
          <button onClick={() => { setMode("login"); setError(""); }} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "login" ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow" : "text-white/50 hover:text-white"}`}>Sign in</button>
          <button onClick={() => { setMode("register"); setError(""); }} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "register" ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow" : "text-white/50 hover:text-white"}`}>Sign up</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-white/60">Full name</label>
              <input id="name" value={form.name} onChange={e => set("name", e.target.value)} required placeholder="Your name" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/20 focus:border-indigo-500 focus:outline-none text-sm" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-white/60">Email</label>
            <input id="email" type="email" value={form.email} onChange={e => set("email", e.target.value)} required placeholder="you@example.com" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/20 focus:border-indigo-500 focus:outline-none text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-white/60">Password</label>
            <div className="relative">
              <input id="password" type={showPass ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} required placeholder="••••••••" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/20 focus:border-indigo-500 focus:outline-none text-sm" />
              <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-3 text-white/30 hover:text-white/70">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 transition-all disabled:opacity-50 mt-2">
            {submitting ? "..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/25 text-xs">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Google SSO */}
        <a
          href={`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"}/api/auth/google`}
          className="flex items-center justify-center gap-3 w-full py-3 rounded-xl bg-white text-gray-800 font-semibold text-sm hover:bg-gray-100 transition-all shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.7 2.3 30.2 0 24 0 14.7 0 6.7 5.4 2.9 13.3l7.9 6.1C12.6 13.1 17.9 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17z" />
            <path fill="#FBBC05" d="M10.8 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6L2.4 13.3A24 24 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8.3-6z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.1 0-11.3-4.1-13.2-9.7l-8.3 6C6.7 42.6 14.7 48 24 48z"/>
          </svg>
          Continue with Google
        </a>

        <p className="text-center text-white/20 text-[11px] mt-5 tracking-wide">
          A product by <span className="text-white/40 font-semibold">Zerith</span>
        </p>
      </div>
    </div>
  );
}
