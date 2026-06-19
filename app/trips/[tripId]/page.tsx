"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Edit, Clock, Calendar, MapPin, Wallet, FileText, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { apiGet, apiPut, api, getUser } from "@/lib/api";
import { ShareTrip } from "@/components/ShareTrip";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { WeatherWidget } from "@/components/WeatherWidget";
import { MembersPanel } from "@/components/MembersPanel";
import { PackingChecklist } from "@/components/PackingChecklist";
import { TripSummary } from "@/components/TripSummary";
import { TripBrief } from "@/components/TripBrief";
import { VisaChecker } from "@/components/VisaChecker";
import { FlightSearch } from "@/components/FlightSearch";
import { formatCurrency } from "@/lib/utils";
import { getMoodClass, getMoodLabel } from "@/lib/destination";

const CURRENCIES = ["USD","EUR","GBP","JPY","INR","AUD","CAD","SGD","THB","MXN","AED","CHF","HKD","SEK","NOK","DKK","NZD","ZAR","BRL","KRW"];

const statusConfig: Record<string, { bg: string; text: string }> = {
  planning: { bg: "bg-blue-100", text: "text-blue-700" },
  active:   { bg: "bg-green-100", text: "text-green-700" },
  completed:{ bg: "bg-gray-100", text: "text-gray-600" },
  cancelled:{ bg: "bg-red-100", text: "text-red-600" },
};

function JourneyBanner({ trip }: { trip: any }) {
  const now = Date.now();
  const start = new Date(trip.start_date).getTime();
  const end = new Date(trip.end_date).getTime();

  if (now < start) {
    const days = Math.ceil((start - now) / 86400000);
    return (
      <div className={`rounded-2xl p-5 text-white text-center ${getMoodClass(trip.destination)}`}>
        <p className="text-white/80 text-sm uppercase tracking-widest font-semibold">Adventure begins in</p>
        <p className="text-6xl font-black mt-1">{days}</p>
        <p className="text-white/80 text-sm mt-1">{days === 1 ? "day" : "days"} · {getMoodLabel(trip.destination)}</p>
      </div>
    );
  }
  if (now >= start && now <= end) {
    const dayNum = Math.floor((now - start) / 86400000) + 1;
    const totalDays = Math.floor((end - start) / 86400000) + 1;
    const pct = Math.round((dayNum / totalDays) * 100);
    return (
      <div className={`rounded-2xl p-5 text-white ${getMoodClass(trip.destination)}`}>
        <p className="text-white/80 text-sm uppercase tracking-widest font-semibold mb-1">You are on Day {dayNum} of {totalDays}</p>
        <div className="h-2 bg-white/30 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-white/80 text-xs">{pct}% of journey complete · {getMoodLabel(trip.destination)}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl p-4 bg-white/5 border border-white/10 text-center">
      <p className="text-2xl mb-1">🎉</p>
      <p className="font-bold text-white">Journey Complete!</p>
      <p className="text-white/50 text-sm">What an adventure it was</p>
    </div>
  );
}

export default function TripOverviewPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const me = getUser();

  async function cloneTrip() {
    setCloning(true);
    try {
      const newTrip = await api<any>(`/api/trips/${tripId}/clone`, { method: "POST" });
      router.push(`/trips/${newTrip.id}`);
    } catch (e: any) {
      alert(e.message);
      setCloning(false);
    }
  }

  const load = useCallback(() => {
    apiGet<any>(`/api/trips/${tripId}`).then(t => {
      setTrip(t);
      setForm({ title: t.title, destination: t.destination, start_date: t.start_date, end_date: t.end_date, status: t.status, notes: t.notes, currency: t.currency, budget_amount: t.budget_amount ?? "" });
      setLoading(false);
    });
  }, [tripId]);

  useEffect(() => { load(); }, [load]);

  async function saveTrip(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await apiPut(`/api/trips/${tripId}`, { ...form, budget_amount: form.budget_amount ? parseFloat(form.budget_amount) : null });
      load(); setEditing(false);
    } finally { setSaving(false); }
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="bg-white/5 rounded-2xl h-28 border border-white/10" />)}
    </div>
  );
  if (!trip) return <div className="text-center py-20 text-white/40">Trip not found</div>;

  const isOwner = trip.owner_id === me?.id;
  const days = Math.max(1, Math.round((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000) + 1);
  const sc = statusConfig[trip.status] ?? statusConfig.planning;

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
        <div className="bg-[#1e293b] rounded-2xl border border-white/10 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          {/* Destination photo header */}
          <div className="h-48 relative overflow-hidden">
            <img
              src={`https://source.unsplash.com/featured/1200x400/?${encodeURIComponent(trip.destination.split(',')[0])},travel`}
              alt={trip.destination}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
            />
            <div className={`absolute inset-0 ${getMoodClass(trip.destination)} hidden`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
              <div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text} mb-2 inline-block`}>{trip.status}</span>
                <h1 className="text-2xl font-bold text-white drop-shadow leading-tight">{trip.title}</h1>
                <p className="text-white/80 text-sm flex items-center gap-1 mt-0.5"><MapPin size={12} />{trip.destination}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <ShareTrip tripId={tripId} />
                {isOwner && (
                  <Button variant="secondary" size="sm" onClick={cloneTrip} disabled={cloning}>
                    <Copy size={13} />{cloning ? "Cloning..." : "Clone Trip"}
                  </Button>
                )}
                {isOwner && <Button variant="secondary" size="sm" onClick={() => setEditing(true)}><Edit size={13} />Edit</Button>}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap gap-4 text-white/50 text-sm">
              <span className="flex items-center gap-1.5"><Calendar size={13} className="text-purple-400" />
                {new Date(trip.start_date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })} – {new Date(trip.end_date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="flex items-center gap-1.5"><Clock size={13} className="text-cyan-400" />{days} days</span>
            </div>
            {trip.notes && <p className="flex items-start gap-1.5 text-white/40 text-sm mt-3"><FileText size={12} className="mt-0.5 shrink-0" />{trip.notes}</p>}

            {/* Budget pill */}
            {trip.budget_amount && (
              <div className="mt-4 inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2">
                <Wallet size={14} className="text-indigo-400" />
                <span className="text-indigo-300 font-bold text-lg">{formatCurrency(trip.budget_amount, trip.currency)}</span>
                <span className="text-white/30 text-xs">total budget</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Journey Story Mode banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <JourneyBanner trip={trip} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
        <FlightSearch trip={trip} />
        <VisaChecker destination={trip.destination} />
        <WeatherWidget destination={trip.destination} />
        <MembersPanel tripId={tripId} ownerId={trip.owner_id} />
        <PackingChecklist tripId={tripId} />
        <TripBrief tripId={tripId} />
        <TripSummary tripId={tripId} />
      </motion.div>

      {editing && (
        <Modal open onClose={() => setEditing(false)} title="Edit Trip">
          <form onSubmit={saveTrip} className="space-y-3">
            <Input label="Name" id="e-title" value={form.title} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))} required />
            <Input label="Destination" id="e-dest" value={form.destination} onChange={e => setForm((p: any) => ({ ...p, destination: e.target.value }))} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start" id="e-start" type="date" value={form.start_date} onChange={e => setForm((p: any) => ({ ...p, start_date: e.target.value }))} />
              <Input label="End" id="e-end" type="date" value={form.end_date} onChange={e => setForm((p: any) => ({ ...p, end_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Budget" id="e-budget" type="number" value={form.budget_amount} onChange={e => setForm((p: any) => ({ ...p, budget_amount: e.target.value }))} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-white/60">Currency</label>
                <select className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none" value={form.currency} onChange={e => setForm((p: any) => ({ ...p, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c} className="bg-[#1e293b]">{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-white/60">Status</label>
              <select className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none" value={form.status} onChange={e => setForm((p: any) => ({ ...p, status: e.target.value }))}>
                <option value="planning" className="bg-[#1e293b]">Planning</option>
                <option value="active" className="bg-[#1e293b]">Active</option>
                <option value="completed" className="bg-[#1e293b]">Completed</option>
                <option value="cancelled" className="bg-[#1e293b]">Cancelled</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-white/60">Notes</label>
              <textarea className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none resize-none placeholder-white/20" rows={2} value={form.notes} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
