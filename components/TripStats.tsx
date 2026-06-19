"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Plane, Globe, Calendar, Wallet, Camera, MapPin, TrendingUp } from "lucide-react";

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: string;
  budget_amount: number | null;
  currency: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  sightseeing: "#6366f1",
  food: "#f97316",
  transport: "#3b82f6",
  accommodation: "#8b5cf6",
  activity: "#10b981",
  shopping: "#ec4899",
  other: "#6b7280",
};

function extractCountry(destination: string): string {
  const parts = destination.split(",").map(s => s.trim());
  return parts[parts.length - 1] || destination;
}

function daysBetween(start: string, end: string): number {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
}

export function TripStats() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<Trip[]>("/api/trips"),
    ]).then(async ([allTrips]) => {
      setTrips(allTrips);

      // Compute stats
      const totalTrips = allTrips.length;
      const totalDays = allTrips.reduce((s, t) => s + daysBetween(t.start_date, t.end_date), 0);
      const countries = new Set(allTrips.map(t => extractCountry(t.destination)));
      const totalBudget = allTrips.reduce((s, t) => s + (t.budget_amount ?? 0), 0);
      const completed = allTrips.filter(t => t.status === "completed");

      // Destination frequency
      const destCount: Record<string, number> = {};
      allTrips.forEach(t => {
        const c = extractCountry(t.destination);
        destCount[c] = (destCount[c] || 0) + 1;
      });
      const mostVisited = Object.entries(destCount).sort((a, b) => b[1] - a[1])[0];

      // Activities & memories stats from individual trips
      let totalActivities = 0;
      let totalMemories = 0;
      const categoryCount: Record<string, number> = {};
      const monthlyCount: Record<string, number> = {};

      await Promise.allSettled(
        allTrips.map(async (trip) => {
          try {
            const [acts, mems] = await Promise.all([
              apiGet<any[]>(`/api/trips/${trip.id}/itinerary`).catch(() => []),
              apiGet<any[]>(`/api/trips/${trip.id}/memories`).catch(() => []),
            ]);
            totalActivities += acts.length;
            totalMemories += mems.length;
            acts.forEach((a: any) => {
              categoryCount[a.category] = (categoryCount[a.category] || 0) + 1;
            });
            // Month from start_date
            const month = trip.start_date.slice(0, 7);
            monthlyCount[month] = (monthlyCount[month] || 0) + 1;
          } catch {}
        })
      );

      const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];
      const sortedMonths = Object.entries(monthlyCount).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
      const maxMonthCount = Math.max(...sortedMonths.map(([, v]) => v), 1);

      setStats({
        totalTrips,
        totalDays,
        countries: countries.size,
        totalBudget,
        mostVisited: mostVisited?.[0] ?? "—",
        totalMemories,
        topCategory: topCategory?.[0] ?? "—",
        categoryCount,
        sortedMonths,
        maxMonthCount,
        completed: completed.length,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-40 bg-[#e2e8f0] rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl border border-[#e2e8f0] animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!stats || trips.length === 0) return null;

  const statCards = [
    { label: "Total Trips", value: stats.totalTrips, icon: Plane, gradient: "from-indigo-500 to-purple-600", glow: "rgba(99,102,241,0.1)" },
    { label: "Days Traveled", value: stats.totalDays, icon: Calendar, gradient: "from-cyan-500 to-blue-600", glow: "rgba(6,182,212,0.1)" },
    { label: "Countries", value: stats.countries, icon: Globe, gradient: "from-emerald-500 to-teal-600", glow: "rgba(16,185,129,0.1)" },
    { label: "Memories", value: stats.totalMemories, icon: Camera, gradient: "from-pink-500 to-rose-600", glow: "rgba(236,72,153,0.1)" },
  ];

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp size={18} className="text-indigo-500" />
        <h2 className="text-xl font-bold text-[#1e2044]">Travel Statistics</h2>
      </div>

      {/* Main stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, gradient, glow }) => (
          <div
            key={label}
            className="bg-white rounded-2xl p-5 space-y-3 border border-[#e2e8f0] hover:shadow-sm transition-all"
            style={{ boxShadow: `0 4px 20px ${glow}` }}
          >
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
              <Icon size={16} className="text-white" />
            </div>
            <div>
              <p className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{value}</p>
              <p className="text-[#94a3b8] text-xs mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Highlights */}
        <div className="bg-white rounded-2xl p-5 space-y-4 border border-[#e2e8f0] shadow-sm">
          <h3 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider">Highlights</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#64748b] text-sm flex items-center gap-2"><MapPin size={13} className="text-indigo-500" />Most visited</span>
              <span className="text-[#1e2044] font-semibold text-sm">{stats.mostVisited}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#64748b] text-sm flex items-center gap-2"><Plane size={13} className="text-emerald-500" />Completed trips</span>
              <span className="text-[#1e2044] font-semibold text-sm">{stats.completed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#64748b] text-sm flex items-center gap-2"><TrendingUp size={13} className="text-purple-500" />Top activity</span>
              <span className="text-[#1e2044] font-semibold text-sm capitalize">{stats.topCategory}</span>
            </div>
            {stats.totalBudget > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[#64748b] text-sm flex items-center gap-2"><Wallet size={13} className="text-amber-500" />Total budgeted</span>
                <span className="text-[#1e2044] font-semibold text-sm">${Math.round(stats.totalBudget).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Activity category breakdown */}
        <div className="bg-white rounded-2xl p-5 space-y-4 border border-[#e2e8f0] shadow-sm">
          <h3 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider">Activity Breakdown</h3>
          {Object.keys(stats.categoryCount).length === 0 ? (
            <p className="text-[#94a3b8] text-sm">No activities logged yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.categoryCount as Record<string, number>)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([cat, count]) => {
                  const total = Object.values(stats.categoryCount as Record<string, number>).reduce((a, b) => a + b, 0);
                  const pct = Math.round((count / total) * 100);
                  const color = CATEGORY_COLORS[cat] || "#6b7280";
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#64748b] capitalize">{cat}</span>
                        <span className="text-[#94a3b8]">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Monthly trips bar chart */}
      {stats.sortedMonths.length > 1 && (
        <div className="bg-white rounded-2xl p-5 space-y-4 border border-[#e2e8f0] shadow-sm">
          <h3 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider">Trips by Month</h3>
          <div className="flex items-end gap-2 h-20">
            {stats.sortedMonths.map(([month, count]: [string, number]) => {
              const pct = Math.round((count / stats.maxMonthCount) * 100);
              const [y, m] = month.split("-");
              const label = new Date(`${y}-${m}-01`).toLocaleDateString("en", { month: "short", year: "2-digit" });
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[#64748b] text-xs">{count}</span>
                  <div className="w-full flex items-end" style={{ height: "48px" }}>
                    <div className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-purple-500 transition-all duration-700" style={{ height: `${Math.max(pct, 10)}%` }} />
                  </div>
                  <span className="text-[#94a3b8] text-xs">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
