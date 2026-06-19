"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { useItinerary } from "@/hooks/useItinerary";
import { DayCard } from "@/components/itinerary/DayCard";
import { PlaceSuggestions } from "@/components/itinerary/PlaceSuggestions";
import { RestaurantFinder } from "@/components/RestaurantFinder";
import { CalendarExport } from "@/components/CalendarExport";
import type { Activity } from "@/types";

const Skeleton = () => (
  <div className="animate-pulse space-y-3">
    {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-2xl border border-white/10" />)}
  </div>
);

function ItineraryContent({ trip }: { trip: any }) {
  const { days, loading, addActivity, updateActivity, deleteActivity, updateDayTitle } = useItinerary(trip);
  const [pendingSuggestion, setPendingSuggestion] = useState<{ name: string; category: string; location: string; description: string } | null>(null);

  function handleSuggestionSelect(s: { name: string; category: string; location: string; description: string }) {
    setPendingSuggestion(s);
    setTimeout(() => document.getElementById("day-0")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-4">
      <div className="bg-[#1e293b] rounded-2xl p-4 flex items-center justify-between gap-3 border border-white/10">
        <div>
          <h2 className="text-lg font-bold text-white">Itinerary</h2>
          <p className="text-white/40 text-sm">{days.length} day{days.length !== 1 ? "s" : ""} planned</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingSuggestion && (
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-1.5">
              <span className="text-xs text-indigo-300 font-medium">📍 Adding: {pendingSuggestion.name}</span>
              <button onClick={() => setPendingSuggestion(null)} className="text-indigo-400 hover:text-indigo-200 text-xs">✕</button>
            </div>
          )}
          <CalendarExport trip={trip} days={days} />
        </div>
      </div>

      {/* AI suggestions panel */}
      <PlaceSuggestions
        tripId={trip.id}
        destination={trip.destination}
        onSelect={handleSuggestionSelect}
      />

      {/* Restaurant finder */}
      <RestaurantFinder
        tripId={trip.id}
        destination={trip.destination}
        onSelect={(r) => handleSuggestionSelect({ name: r.name, category: "food", location: r.address, description: r.cuisine })}
      />

      {pendingSuggestion && (
        <p className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2">
          ✨ Click <strong>Add Activity</strong> on any day below to place <strong>{pendingSuggestion.name}</strong> there
        </p>
      )}

      {days.map((day, idx) => (
        <div key={day.id} id={`day-${idx}`}>
          <DayCard
            day={day}
            prefill={pendingSuggestion ? {
              title: pendingSuggestion.name,
              location: pendingSuggestion.location,
              category: pendingSuggestion.category as any,
              description: pendingSuggestion.description,
            } : undefined}
            onAddActivity={(input: Omit<Activity, "id" | "dayId" | "tripId" | "order">) => {
              addActivity(day.id, input);
              setPendingSuggestion(null);
            }}
            onUpdateActivity={(aid: string, u: Partial<Activity>) => updateActivity(day.id, aid, u)}
            onDeleteActivity={(aid: string) => deleteActivity(day.id, aid)}
            onUpdateTitle={(t: string) => updateDayTitle(day.id, t)}
          />
        </div>
      ))}
    </div>
  );
}

export default function ItineraryPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<any>(`/api/trips/${tripId}`)
      .then(t => { setTrip(t); setLoading(false); })
      .catch((e: any) => { setError(e.message || "Unknown error"); setLoading(false); });
  }, [tripId]);

  if (loading) return <Skeleton />;
  if (!trip) return <p className="text-white/40 text-center py-10">Trip not found — {error}</p>;
  return <ItineraryContent trip={trip} />;
}
