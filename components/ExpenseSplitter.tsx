"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Users } from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface Settlement { from: string; to: string; amount: number; fromName: string; toName: string; }
interface Balance { [userId: string]: number }

interface Props {
  tripId: string;
  currency: string;
  refreshKey?: number;
}

export function ExpenseSplitter({ tripId, currency, refreshKey }: Props) {
  const [data, setData] = useState<{ balances: Balance; settlements: Settlement[] } | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string; avatar_color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet<any>(`/api/trips/${tripId}/expenses/balances`),
      apiGet<any>(`/api/trips/${tripId}`),
    ]).then(([bal, trip]) => {
      setData(bal);
      const all: { id: string; name: string; avatar_color: string }[] = [];
      if (trip.owner) all.push(trip.owner);
      if (Array.isArray(trip.members)) {
        for (const m of trip.members) {
          if (!all.find((x: any) => x.id === m.id)) all.push(m);
        }
      }
      setMembers(all);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tripId, refreshKey]);

  if (loading) return <div className="h-24 bg-white/5 animate-pulse rounded-2xl border border-white/10" />;
  if (!data) return null;

  // Only show if there are members with balances
  const hasActivity = Object.keys(data.balances).length > 0;
  if (!hasActivity) return null;

  const settled = data.settlements.length === 0;

  return (
    <div className="bg-[#1e293b] rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <Users size={16} className="text-indigo-400" />
        <h3 className="font-semibold text-white text-sm">Split Summary</h3>
      </div>

      {/* Per-member balances */}
      <div className="px-4 py-3 space-y-2">
        {members
          .filter(m => data.balances[m.id] !== undefined)
          .map(m => {
            const bal = data.balances[m.id] ?? 0;
            const isOwed = bal > 0.01;
            const owes = bal < -0.01;
            return (
              <div key={m.id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: m.avatar_color ?? "#6366f1" }}
                >
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{m.name}</p>
                  <p className="text-xs text-white/40">
                    {isOwed ? "gets back" : owes ? "owes" : "settled up"}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${isOwed ? "text-green-400" : owes ? "text-red-400" : "text-white/30"}`}>
                  {isOwed ? "+" : owes ? "-" : ""}{formatCurrency(Math.abs(bal), currency)}
                </span>
              </div>
            );
          })}
      </div>

      {/* Settlements */}
      <div className="px-4 pb-4">
        {settled ? (
          <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-center">
            <p className="text-green-400 text-sm font-medium">✓ All settled up</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/30 uppercase tracking-wider mb-2">Suggested payments</p>
            {data.settlements.map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-3 bg-orange-500/8 border border-orange-500/20 rounded-xl">
                <span className="text-sm font-medium text-white truncate">{s.fromName}</span>
                <ArrowRight size={14} className="text-orange-400 shrink-0" />
                <span className="text-sm font-medium text-white truncate">{s.toName}</span>
                <span className="ml-auto font-bold text-orange-400 shrink-0">{formatCurrency(s.amount, currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
