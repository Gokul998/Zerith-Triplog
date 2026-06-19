"use client";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface Settlement { from: string; to: string; amount: number; fromName: string; toName: string; }
interface Balance { [userId: string]: number }

export function ExpenseSplitter({ tripId, currency }: { tripId: string; currency: string }) {
  const [data, setData] = useState<{ balances: Balance; settlements: Settlement[] } | null>(null);

  useEffect(() => {
    apiGet<any>(`/api/trips/${tripId}/expenses/balances`).then(setData);
  }, [tripId]);

  if (!data) return <div className="h-20 bg-white/5 animate-pulse rounded-2xl border border-white/10" />;
  if (data.settlements.length === 0) return (
    <div className="bg-green-500/10 rounded-2xl p-4 text-center border border-green-500/20">
      <p className="text-green-400 font-medium">✓ All settled up!</p>
      <p className="text-green-400/70 text-sm">No money owed between members</p>
    </div>
  );

  return (
    <div className="bg-[#1e293b] rounded-2xl p-4 border border-white/10">
      <h3 className="font-semibold text-white mb-3">Settle Up</h3>
      <div className="space-y-2">
        {data.settlements.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <span className="font-medium text-white">{s.fromName}</span>
            <ArrowRight size={14} className="text-orange-400 shrink-0" />
            <span className="font-medium text-white">{s.toName}</span>
            <span className="ml-auto font-bold text-orange-400">{formatCurrency(s.amount, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
