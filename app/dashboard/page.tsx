"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Plane, LogOut, MapPin, Calendar, Wallet, Sparkles, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { TripStats } from "@/components/TripStats";
import { apiGet, apiPost, UpgradeRequiredError } from "@/lib/api";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useRouter } from "next/navigation";
import { getMoodClass, getMoodLabel, getMoodEmoji, getDestinationCode } from "@/lib/destination";

const CURRENCIES = ["USD","EUR","GBP","JPY","INR","AUD","CAD","SGD","THB","MXN","AED","CHF","HKD","SEK","NOK","DKK","NZD","ZAR","BRL","KRW"];

function detectCurrency(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = locale.split("-")[1]?.toUpperCase();
    const map: Record<string, string> = { IN:"INR",GB:"GBP",JP:"JPY",AU:"AUD",CA:"CAD",SG:"SGD",TH:"THB",MX:"MXN",AE:"AED",CH:"CHF",HK:"HKD",SE:"SEK",NO:"NOK",DK:"DKK",NZ:"NZD",ZA:"ZAR",BR:"BRL",KR:"KRW" };
    return map[region] ?? "USD";
  } catch { return "USD"; }
}

interface Trip {
  id: string; title: string; destination: string; start_date: string; end_date: string;
  status: string; budget_amount: number | null; currency: string; member_count: number;
  is_owner: number; owner_name?: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}
function getDays(s: string, e: string) {
  return Math.max(1, Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1);
}

// ─── Concept B: Magazine hero + Concept A: Bento stat tiles ──────────────────
function MagazineHero({ trip, allTrips, onClick }: { trip: Trip; allTrips: Trip[]; onClick: () => void }) {
  const totalDays = allTrips.reduce((s, t) => s + getDays(t.start_date, t.end_date), 0);
  const countries = new Set(allTrips.map(t => t.destination.split(",").pop()?.trim())).size;
  const active = allTrips.filter(t => t.status === "active" || t.status === "planning").length;

  const stats = [
    { label: "TRIPS", val: allTrips.length, emoji: "✈️", cls: "stat-indigo" },
    { label: "DAYS", val: totalDays, emoji: "📅", cls: "stat-cyan" },
    { label: "COUNTRIES", val: countries, emoji: "🌍", cls: "stat-amber" },
    { label: "ACTIVE", val: active, emoji: "🟢", cls: "stat-green" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-2">
      {/* Left: Magazine full-bleed hero */}
      <motion.div
        initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
        onClick={onClick}
        className="md:col-span-3 relative rounded-2xl overflow-hidden cursor-pointer group"
        style={{ minHeight: 260 }}
      >
        <img
          src={`https://source.unsplash.com/featured/900x520/?${encodeURIComponent(trip.destination.split(",")[0])},travel,landscape`}
          alt={trip.destination}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className={`absolute inset-0 ${getMoodClass(trip.destination)} opacity-60`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <div className="absolute inset-0 p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-[2px] text-white/50 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">Featured Trip</span>
            <span className="text-3xl float-anim">{getMoodEmoji(trip.destination)}</span>
          </div>
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3" style={{ background: "rgba(99,102,241,0.75)", color: "white", backdropFilter: "blur(8px)" }}>
              {getMoodLabel(trip.destination)}
            </span>
            <h2 className="text-4xl font-black text-white leading-tight drop-shadow mb-2">{trip.title}</h2>
            <p className="text-white/60 text-sm flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1"><MapPin size={12} />{trip.destination}</span>
              <span className="text-white/20">·</span>
              <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(trip.start_date)} – {formatDate(trip.end_date)}</span>
              <span className="text-white/20">·</span>
              <span>{getDays(trip.start_date, trip.end_date)} days</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Right: 2×2 Bento stat tiles */}
      <div className="md:col-span-2 grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.09, type: "spring", stiffness: 180 }}
            className={`${s.cls} rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden`}
            style={{ minHeight: 120 }}
          >
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(45deg,rgba(255,255,255,0.3) 0px,rgba(255,255,255,0.3) 1px,transparent 1px,transparent 8px)" }} />
            <div className="text-2xl mb-1 relative z-10">{s.emoji}</div>
            <div className="text-white font-black relative z-10" style={{ fontSize: 36, lineHeight: 1 }}>{s.val}</div>
            <div className="text-white/70 text-[10px] uppercase tracking-widest relative z-10 mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Concept A: 3D Bento trip tile ───────────────────────────────────────────
function BentoTripTile({ trip, large, index }: { trip: Trip; large?: boolean; index: number }) {
  const router = useRouter();
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -ny * 8, ry: nx * 8 });
  }
  function onMouseLeave() { setTilt({ rx: 0, ry: 0 }); }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className={`cursor-pointer ${large ? "sm:col-span-2" : ""}`}
      style={{ perspective: 900 }}
      onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
      onClick={() => router.push(`/trips/${trip.id}`)}
    >
      <div style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`, transition: "transform 0.15s ease", transformStyle: "preserve-3d" }}>
      {large ? (
        // Wide horizontal boarding pass
        <div className="rounded-2xl overflow-hidden flex shadow-[0_8px_40px_rgba(0,0,0,0.45)] border border-white/10 h-48" style={{ background: "#1e293b" }}>
          <div className="w-2/5 relative flex-shrink-0">
            <img
              src={`https://source.unsplash.com/featured/400x400/?${encodeURIComponent(trip.destination.split(",")[0])},travel`}
              alt={trip.destination} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className={`absolute inset-0 ${getMoodClass(trip.destination)} opacity-55`} />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1e293b]" />
            <div className="absolute bottom-3 left-3 z-10">
              <p className="text-4xl font-black text-white drop-shadow leading-none">{getDestinationCode(trip.destination)}</p>
              <p className="text-white/50 text-xs uppercase tracking-wider mt-0.5">{trip.destination.split(",")[0].slice(0, 14)}</p>
            </div>
          </div>
          <div className="flex-1 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5">Journey</p>
                  <p className="text-xl font-bold text-white leading-tight">{trip.title}</p>
                </div>
                <span className="text-2xl">{getMoodEmoji(trip.destination)}</span>
              </div>
              <p className="text-white/30 text-xs">{getMoodLabel(trip.destination)}</p>
            </div>
            <div className="border-t border-dashed border-white/10 pt-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/25 uppercase tracking-wider">Depart</p>
                <p className="text-sm font-bold text-white">{formatDate(trip.start_date)}</p>
              </div>
              <div className="flex items-center gap-1 flex-1 px-3">
                <div className="flex-1 h-px border-t border-dashed border-white/15" />
                <span className="text-indigo-400">✈</span>
                <div className="flex-1 h-px border-t border-dashed border-white/15" />
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/25 uppercase tracking-wider">{getDays(trip.start_date, trip.end_date)}d</p>
                <p className="text-sm font-bold text-white">{formatDate(trip.end_date)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Compact portrait tile
        <div className="rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-white/10 h-48" style={{ background: "#1e293b" }}>
          <div className="h-[100px] relative">
            <img
              src={`https://source.unsplash.com/featured/400x200/?${encodeURIComponent(trip.destination.split(",")[0])},travel`}
              alt={trip.destination} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className={`absolute inset-0 ${getMoodClass(trip.destination)} opacity-55`} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] to-transparent" />
            <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between z-10">
              <p className="text-2xl font-black text-white drop-shadow leading-none">{getDestinationCode(trip.destination)}</p>
              <span className="text-xl">{getMoodEmoji(trip.destination)}</span>
            </div>
          </div>
          <div className="px-3 py-2.5">
            <p className="text-sm font-bold text-white truncate">{trip.title}</p>
            <p className="text-xs text-white/35 mt-0.5">{formatDate(trip.start_date)} · {getDays(trip.start_date, trip.end_date)}d</p>
            {trip.budget_amount && (
              <p className="text-xs text-indigo-400 font-semibold mt-1.5 flex items-center gap-1">
                <Wallet size={10} />{new Intl.NumberFormat("en", { style: "currency", currency: trip.currency, maximumFractionDigits: 0 }).format(trip.budget_amount)}
              </p>
            )}
          </div>
        </div>
      )}
      </div>
    </motion.div>
  );
}

// ─── Concept C: Journey Map ───────────────────────────────────────────────────
function JourneyMap({ trips }: { trips: Trip[] }) {
  if (trips.length === 0) return null;
  const W = 620; const H = 190;
  const sorted = [...trips].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const n = sorted.length;
  const pinColors = ["#6366f1", "#06b6d4", "#f59e0b", "#10b981", "#ec4899", "#a855f7"];

  const pins = sorted.map((t, i) => ({
    x: n === 1 ? W / 2 : 55 + (i / (n - 1)) * (W - 110),
    y: i % 2 === 0 ? 70 : 125,
    trip: t,
    color: pinColors[i % pinColors.length],
  }));

  const pathD = pins.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pins[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
      className="relative rounded-2xl border border-white/10 overflow-hidden"
      style={{ background: "#0d1526" }}
    >
      <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "22px 22px", pointerEvents: "none" }} />
      <div className="px-5 pt-4 pb-0 flex items-center justify-between relative">
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-[2px] font-bold">Your Journey Path</p>
          <p className="text-white font-bold text-sm mt-0.5">{n} destination{n !== 1 ? "s" : ""} connected</p>
        </div>
        <span className="text-2xl">🗺️</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full relative" style={{ height: H }}>
        <defs>
          <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" /><stop offset="50%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="glow2"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        {/* Path */}
        <path d={pathD} stroke="url(#pg)" strokeWidth="2.5" strokeDasharray="9 5" fill="none" opacity="0.65" filter="url(#glow2)" />

        {/* Pins */}
        {pins.map((p, i) => {
          const above = p.y < 100;
          return (
            <g key={p.trip.id}>
              <circle cx={p.x} cy={p.y} r="16" fill={p.color} opacity="0.12" />
              <circle cx={p.x} cy={p.y} r="9" fill={p.color} stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
              <text x={p.x} y={above ? p.y - 20 : p.y + 26} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10" fontWeight="700" letterSpacing="0.5">
                {getDestinationCode(p.trip.destination)}
              </text>
              <text x={p.x} y={above ? p.y - 9 : p.y + 37} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8">
                {new Date(p.trip.start_date).toLocaleDateString("en", { month: "short", year: "2-digit" })}
              </text>
            </g>
          );
        })}

        {/* Future ghost pin */}
        {n < 6 && (
          <g opacity="0.35">
            <circle cx={Math.min(pins[n - 1].x + 90, W - 30)} cy={n % 2 === 0 ? 125 : 70}
              r="7" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="3 2" />
            <text x={Math.min(pins[n - 1].x + 90, W - 30)} y={n % 2 === 0 ? 148 : 55}
              textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8">NEXT?</text>
          </g>
        )}
      </svg>
    </motion.div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState("");
  const [form, setForm] = useState({ title: "", destination: "", start_date: "", end_date: "", notes: "", budget_amount: "", currency: detectCurrency() });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const userPlan: string = (user as any)?.plan ?? "free";

  const load = useCallback(() => {
    apiGet<Trip[]>("/api/trips").then(t => { setTrips(t); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createTrip(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await apiPost("/api/trips", { ...form, budget_amount: form.budget_amount ? parseFloat(form.budget_amount) : null });
      load(); setShowCreate(false);
      setForm({ title: "", destination: "", start_date: "", end_date: "", notes: "", budget_amount: "", currency: detectCurrency() });
    } catch (err: any) {
      if (err instanceof UpgradeRequiredError) { setUpgradeMsg(err.message); setShowUpgrade(true); setShowCreate(false); }
      else alert(err.message);
    }
    finally { setSaving(false); }
  }

  const myTrips = trips.filter(t => t.is_owner);
  const invitedTrips = trips.filter(t => !t.is_owner);
  const now = Date.now();
  const featured = myTrips.find(t => new Date(t.start_date).getTime() > now)
    ?? myTrips.find(t => t.status === "active")
    ?? myTrips[0];

  return (
    <div className="min-h-screen mesh-bg">
      <header className="bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-1.5 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)]"><Plane size={18} /></div>
            <span className="text-lg font-black gradient-text">TripLog</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {userPlan !== "pro" && (
              <button onClick={() => router.push("/pricing")} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:from-amber-500/30 transition-all">
                <Crown size={12} />
                {userPlan === "trial" ? "Trial" : "Upgrade"}
              </button>
            )}
            {userPlan === "pro" && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                <Crown size={12} />Pro
              </div>
            )}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: user?.avatar_color }}>{user?.name?.[0]}</div>
              <span className="text-sm text-white/60 hidden sm:block">{user?.name?.split(" ")[0]}</span>
            </div>
            <button onClick={logout} className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-colors"><LogOut size={16} /></button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:from-indigo-400 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/30">
              <Plus size={16} /> <span className="hidden sm:inline">New Trip</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <p className="text-white/30 text-sm flex items-center gap-1.5 mb-1"><Sparkles size={13} />Welcome back, {user?.name?.split(" ")[0]}</p>
          <h1 className="text-3xl sm:text-4xl font-black gradient-text leading-tight">Your Journeys</h1>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3" style={{ minHeight: 260 }}>
              <div className="md:col-span-3 bg-white/5 rounded-2xl animate-pulse border border-white/10" />
              <div className="md:col-span-2 grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="rounded-2xl bg-white/5 animate-pulse border border-white/10" />)}
              </div>
            </div>
          </div>
        ) : trips.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center py-24 gap-4">
            <div className="text-6xl float-anim">✈️</div>
            <div className="text-center">
              <h3 className="text-white font-bold text-xl mb-1">No adventures yet</h3>
              <p className="text-white/30 text-sm">Your journey starts with a single destination</p>
            </div>
            <Button onClick={() => setShowCreate(true)}><Plus size={15} />Plan your first trip</Button>
          </motion.div>
        ) : (
          <>
            {/* B+A: Magazine hero + bento stats */}
            {featured && <MagazineHero trip={featured} allTrips={trips} onClick={() => router.push(`/trips/${featured.id}`)} />}

            {/* A: Bento grid */}
            {myTrips.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">My Trips</h2>
                    <p className="text-white/30 text-xs mt-0.5">{myTrips.length} {myTrips.length === 1 ? "adventure" : "adventures"}</p>
                  </div>
                  <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors border border-white/10">
                    <Plus size={13} /> New
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {myTrips.map((t, i) => (
                    <BentoTripTile key={t.id} trip={t} large={i === 0 && myTrips.length > 1} index={i} />
                  ))}
                </div>
              </section>
            )}

            {invitedTrips.length > 0 && (
              <section className="space-y-3">
                <div>
                  <h2 className="text-lg font-bold text-white">Invited Trips</h2>
                  <p className="text-white/30 text-xs mt-0.5">Shared with you</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {invitedTrips.map((t, i) => <BentoTripTile key={t.id} trip={t} index={i} />)}
                </div>
              </section>
            )}

            {/* C: Journey Map */}
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-bold text-white">Journey Path</h2>
                <p className="text-white/30 text-xs mt-0.5">All your destinations connected</p>
              </div>
              <JourneyMap trips={trips} />
            </section>

            <TripStats />
          </>
        )}
      </main>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Trip">
        <form onSubmit={createTrip} className="flex flex-col gap-4">
          <Input label="Trip name" id="c-title" value={form.title} onChange={e => set("title", e.target.value)} required placeholder="Summer in Japan" />
          <Input label="Destination" id="c-dest" value={form.destination} onChange={e => set("destination", e.target.value)} required placeholder="Tokyo, Japan" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start date" id="c-start" type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} required />
            <Input label="End date" id="c-end" type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} required />
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><Input label="Budget (optional)" id="c-budget" type="number" value={form.budget_amount} onChange={e => set("budget_amount", e.target.value)} placeholder="3000" /></div>
            <div className="w-28 flex flex-col gap-1">
              <label className="text-sm font-medium text-white/60">Currency</label>
              <select className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none" value={form.currency} onChange={e => set("currency", e.target.value)}>
                {CURRENCIES.map(c => <option key={c} className="bg-[#1e293b]">{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-white/60">Notes</label>
            <textarea className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none resize-none placeholder-white/20" rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes..." />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Creating..." : "Create Trip"}</Button>
          </div>
        </form>
      </Modal>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} message={upgradeMsg} />
    </div>
  );
}

export default function DashboardPage() {
  return <AuthGate><Dashboard /></AuthGate>;
}
