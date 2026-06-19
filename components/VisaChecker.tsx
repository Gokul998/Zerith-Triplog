"use client";
import { useState } from "react";
import { Loader2, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// Common countries for passport dropdown
const COUNTRIES = [
  { code: "US", name: "United States" }, { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" }, { code: "AU", name: "Australia" },
  { code: "IN", name: "India" }, { code: "CN", name: "China" },
  { code: "JP", name: "Japan" }, { code: "DE", name: "Germany" },
  { code: "FR", name: "France" }, { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" }, { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" }, { code: "SG", name: "Singapore" },
  { code: "AE", name: "UAE" }, { code: "ZA", name: "South Africa" },
  { code: "PH", name: "Philippines" }, { code: "ID", name: "Indonesia" },
  { code: "TH", name: "Thailand" }, { code: "KR", name: "South Korea" },
  { code: "NG", name: "Nigeria" }, { code: "PK", name: "Pakistan" },
  { code: "BD", name: "Bangladesh" }, { code: "NZ", name: "New Zealand" },
  { code: "MY", name: "Malaysia" }, { code: "EG", name: "Egypt" },
];

interface VisaResult {
  visaRequired: boolean;
  visaOnArrival: boolean;
  eVisa: boolean;
  duration: string;
  requirements: string[];
  notes: string;
}

interface Props {
  destination: string;
}

export function VisaChecker({ destination }: Props) {
  const [open, setOpen] = useState(false);
  const [passport, setPassport] = useState("US");
  const [result, setResult] = useState<VisaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${BASE}/api/visa?passport=${passport}&destination=${encodeURIComponent(destination)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Check failed" }));
        throw new Error(err.error || "Check failed");
      }
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message || "Failed to check visa requirements");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🛂</span>
          <span className="font-semibold text-white text-sm">Visa Requirements</span>
        </div>
        {open ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
      </button>

      {open && (
        <div className="border-t border-white/5 p-4 space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-medium text-white/60">Your passport</label>
              <select
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                value={passport}
                onChange={e => { setPassport(e.target.value); setResult(null); setError(null); }}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code} className="bg-gray-900">{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-medium text-white/60">Destination</label>
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/70 truncate">
                {destination}
              </div>
            </div>
            <Button size="sm" onClick={check} disabled={loading} className="shrink-0">
              {loading ? <Loader2 size={14} className="animate-spin" /> : "Check"}
            </Button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-indigo-400 text-sm py-2">
              <Loader2 size={16} className="animate-spin" />
              Checking visa requirements via AI...
            </div>
          )}

          {result && (
            <div className={`rounded-xl border p-4 space-y-3 ${result.visaRequired ? "bg-amber-500/5 border-amber-500/20" : "bg-green-500/5 border-green-500/20"}`}>
              {/* Status icons row */}
              <div className="flex flex-wrap gap-3">
                <div className={`flex items-center gap-1.5 text-sm font-semibold ${result.visaRequired ? "text-amber-400" : "text-green-400"}`}>
                  {result.visaRequired
                    ? <AlertTriangle size={16} />
                    : <CheckCircle size={16} />}
                  {result.visaRequired ? "Visa Required" : "No Visa Required"}
                </div>

                {result.visaOnArrival && (
                  <div className="flex items-center gap-1.5 text-sm text-blue-400">
                    <CheckCircle size={14} /> Visa on Arrival
                  </div>
                )}
                {result.eVisa && (
                  <div className="flex items-center gap-1.5 text-sm text-purple-400">
                    <CheckCircle size={14} /> e-Visa Available
                  </div>
                )}
              </div>

              {result.duration && (
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs">Stay duration:</span>
                  <span className="text-white text-sm font-medium">{result.duration}</span>
                </div>
              )}

              {result.requirements?.length > 0 && (
                <div>
                  <p className="text-white/40 text-xs mb-1.5">Requirements:</p>
                  <ul className="space-y-1">
                    {result.requirements.map((r, i) => (
                      <li key={i} className="text-white/70 text-xs flex items-start gap-1.5">
                        <span className="text-indigo-400 mt-0.5 shrink-0">•</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.notes && (
                <p className="text-white/40 text-xs italic">{result.notes}</p>
              )}

              <p className="text-white/25 text-xs">AI-generated — verify with official government sources before travel.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
