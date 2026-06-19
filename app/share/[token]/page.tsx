"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MapPin, Calendar, Clock } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

const categoryIcons: Record<string, string> = {
  sightseeing: "🏛️",
  food: "🍽️",
  transport: "🚌",
  accommodation: "🏨",
  activity: "🎯",
  shopping: "🛍️",
  nature: "🌿",
  nightlife: "🌙",
  other: "📌",
};

export default function PublicSharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/share/${token}`)
      .then(async r => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({ error: "Not found" }));
          throw new Error(e.error);
        }
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [token]);

  if (loading) return (
    <div className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="text-[#64748b] animate-pulse text-lg">Loading trip...</div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-5xl">🔗</div>
        <p className="text-[#64748b] text-lg">{error || "This share link is no longer active."}</p>
        <a href="/" className="text-indigo-500 hover:text-indigo-600 text-sm underline">Go to TripLog</a>
      </div>
    </div>
  );

  const { trip, days, memoriesCount } = data;
  const startDate = new Date(trip.start_date).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" });
  const endDate = new Date(trip.end_date).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" });
  const tripDays = Math.max(1, Math.round((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000) + 1);
  const totalActivities = days.reduce((sum: number, d: any) => sum + d.activities.length, 0);

  return (
    <div className="min-h-screen mesh-bg">
      {/* Header */}
      <div className="bg-white border-b border-[#e2e8f0] shadow-sm px-4 py-3 flex items-center justify-between">
        <span className="gradient-text font-bold text-sm tracking-wide">TripLog</span>
        <span className="text-[#94a3b8] text-xs">Read-only view</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0]">
          <h1 className="text-3xl font-bold text-[#1e2044] mb-2">{trip.title}</h1>
          <div className="flex flex-wrap gap-4 text-[#64748b] text-sm mb-4">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-indigo-500" />{trip.destination}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-purple-500" />{startDate} – {endDate}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-cyan-500" />{tripDays} days
            </span>
          </div>
          {trip.notes && (
            <p className="text-[#64748b] text-sm border-t border-[#e2e8f0] pt-3 mt-3">{trip.notes}</p>
          )}
          {/* Stats */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-[#e2e8f0]">
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{days.length}</p>
              <p className="text-[#94a3b8] text-xs">days planned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{totalActivities}</p>
              <p className="text-[#94a3b8] text-xs">activities</p>
            </div>
            {memoriesCount > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-pink-600">{memoriesCount}</p>
                <p className="text-[#94a3b8] text-xs">memories</p>
              </div>
            )}
          </div>
        </div>

        {/* Itinerary */}
        {days.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-[#94a3b8] shadow-sm border border-[#e2e8f0]">
            No itinerary planned yet.
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-[#1e2044] font-semibold text-lg px-1">Itinerary</h2>
            {days.map((day: any) => {
              const dayLabel = new Date(day.date + "T00:00:00").toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });
              return (
                <div key={day.date} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#e2e8f0]">
                  <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f8faff]">
                    <p className="text-[#1e2044] font-semibold text-sm">{dayLabel}</p>
                  </div>
                  {day.activities.length === 0 ? (
                    <p className="text-[#94a3b8] text-sm px-4 py-3">No activities</p>
                  ) : (
                    <div className="divide-y divide-[#e2e8f0]">
                      {day.activities.map((act: any) => (
                        <div key={act.id} className="px-4 py-3 flex gap-3">
                          <span className="text-xl mt-0.5 shrink-0">{categoryIcons[act.category] || "📌"}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[#1e2044] font-medium text-sm">{act.title}</p>
                              {act.start_time && (
                                <span className="text-[#94a3b8] text-xs">{act.start_time}{act.end_time ? ` – ${act.end_time}` : ""}</span>
                              )}
                            </div>
                            {act.location && (
                              <p className="text-[#94a3b8] text-xs mt-0.5 flex items-center gap-1">
                                <MapPin size={10} />{act.location}
                              </p>
                            )}
                            {act.description && (
                              <p className="text-[#94a3b8] text-xs mt-1">{act.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-[#94a3b8] text-xs border-t border-[#e2e8f0] mt-8">
        <p>Powered by <span className="text-indigo-500 font-semibold">TripLog</span> — Plan trips together</p>
        <a href="/" className="text-indigo-400 hover:text-indigo-500 mt-1 inline-block underline">Create your own trip →</a>
      </footer>
    </div>
  );
}
