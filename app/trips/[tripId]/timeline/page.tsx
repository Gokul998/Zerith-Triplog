"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { useItinerary } from "@/hooks/useItinerary";
import { MapPin, Clock, Wallet, UtensilsCrossed, ShoppingBag, Bike, BedDouble, Bus, Landmark } from "lucide-react";

const categoryConfig: Record<string, { icon: any; color: string; bg: string }> = {
  sightseeing: { icon: Landmark,       color: "text-indigo-400",  bg: "bg-indigo-500/20" },
  food:        { icon: UtensilsCrossed, color: "text-orange-400", bg: "bg-orange-500/20" },
  shopping:    { icon: ShoppingBag,    color: "text-pink-400",    bg: "bg-pink-500/20" },
  activity:    { icon: Bike,           color: "text-green-400",   bg: "bg-green-500/20" },
  accommodation:{ icon: BedDouble,     color: "text-purple-400",  bg: "bg-purple-500/20" },
  transport:   { icon: Bus,            color: "text-cyan-400",    bg: "bg-cyan-500/20" },
};

const getCatConfig = (cat: string) => categoryConfig[cat] || categoryConfig.sightseeing;

export default function TimelinePage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<any>(null);
  const { days, loading } = useItinerary(trip);

  useEffect(() => {
    apiGet<any>(`/api/trips/${tripId}`).then(setTrip).catch(() => {});
  }, [tripId]);

  if (loading || !trip) return (
    <div className="space-y-6 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-white/10 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded w-32" />
            <div className="h-20 bg-white/5 rounded-2xl border border-white/10" />
          </div>
        </div>
      ))}
    </div>
  );

  const totalActivities = days.reduce((s, d) => s + d.activities.length, 0);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="bg-[#1e293b] rounded-2xl p-4 mb-6 flex items-center justify-between border border-white/10">
        <div>
          <h2 className="text-lg font-bold text-white">Trip Timeline</h2>
          <p className="text-white/40 text-sm">{days.length} days · {totalActivities} activities</p>
        </div>
        <div className="text-3xl">🗓️</div>
      </div>

      {days.length === 0 && (
        <div className="bg-[#1e293b] rounded-2xl p-16 text-center border border-white/10">
          <p className="text-4xl mb-3">📅</p>
          <h3 className="text-white/50 font-semibold mb-1">No itinerary yet</h3>
          <p className="text-white/30 text-sm">Add activities in the Itinerary tab to see them here</p>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {days.length > 0 && (
          <div className="absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-indigo-400/60 via-purple-400/40 to-transparent" />
        )}

        <div className="space-y-8">
          {days.map((day, dayIdx) => (
            <div key={day.id} className="relative flex gap-4">
              {/* Day bubble */}
              <div className="shrink-0 z-10">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm border-2 border-[#0f172a]">
                  <span className="text-white font-bold text-xs">D{day.dayNumber}</span>
                </div>
              </div>

              {/* Day content */}
              <div className="flex-1 pb-2">
                <div className="mb-3 flex items-center gap-3">
                  <div>
                    <p className="font-bold text-white">{day.title}</p>
                    <p className="text-white/40 text-xs">{new Date(day.date).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</p>
                  </div>
                  {day.activities.length > 0 && (
                    <span className="ml-auto text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-white/50">
                      {day.activities.length} {day.activities.length === 1 ? "activity" : "activities"}
                    </span>
                  )}
                </div>

                {day.activities.length === 0 ? (
                  <div className="bg-white/5 rounded-xl px-4 py-3 border-dashed border-2 border-white/10">
                    <p className="text-white/30 text-sm">No activities planned</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {day.activities.map((act, actIdx) => {
                      const cfg = getCatConfig(act.category);
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={act.id}
                          className="bg-[#1e293b] rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all group"
                          style={{ animationDelay: `${(dayIdx * 100) + (actIdx * 50)}ms` }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                              <Icon size={14} className={cfg.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white text-sm truncate">{act.title}</p>
                              <div className="flex flex-wrap gap-3 mt-1">
                                {act.location && (
                                  <span className="flex items-center gap-1 text-white/40 text-xs">
                                    <MapPin size={10} />{act.location}
                                  </span>
                                )}
                                {act.startTime && (
                                  <span className="flex items-center gap-1 text-white/40 text-xs">
                                    <Clock size={10} />{act.startTime}
                                  </span>
                                )}
                                {act.cost > 0 && (
                                  <span className="flex items-center gap-1 text-indigo-600 text-xs font-medium">
                                    <Wallet size={10} />₹{act.cost}
                                  </span>
                                )}
                              </div>
                              {act.description && (
                                <p className="text-white/30 text-xs mt-1.5 line-clamp-2">{act.description}</p>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full border border-white/10 ${cfg.bg} ${cfg.color} shrink-0 capitalize`}>{act.category}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
