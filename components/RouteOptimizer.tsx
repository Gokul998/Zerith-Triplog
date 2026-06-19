"use client";
import { useState } from "react";
import { ArrowUp, ArrowDown, MapPin, Route, Check } from "lucide-react";
import type { Activity, ItineraryDay } from "@/types";
import { Button } from "@/components/ui/Button";

interface Props {
  day: ItineraryDay;
  onReorder: (activityId: string, newOrder: number) => void;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Simple geocode cache
const geocodeCache = new Map<string, { lat: number; lon: number } | null>();

async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  if (geocodeCache.has(location)) return geocodeCache.get(location)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { "User-Agent": "TripLog/1.0" } }
    );
    const data = await res.json();
    if (data?.[0]) {
      const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      geocodeCache.set(location, result);
      return result;
    }
  } catch { /* ignore */ }
  geocodeCache.set(location, null);
  return null;
}

export function RouteOptimizer({ day, onReorder }: Props) {
  const activitiesWithLocation = day.activities.filter(a => a.location?.trim());
  const [order, setOrder] = useState<Activity[]>(() => [...activitiesWithLocation].sort((a, b) => a.order - b.order));
  const [distances, setDistances] = useState<(number | null)[]>([]);
  const [loadingDist, setLoadingDist] = useState(false);
  const [applied, setApplied] = useState(false);

  async function calculateDistances(acts: Activity[]) {
    setLoadingDist(true);
    try {
      const coords = await Promise.all(acts.map(a => geocodeLocation(a.location)));
      const dists: (number | null)[] = [];
      for (let i = 0; i < acts.length - 1; i++) {
        const c1 = coords[i];
        const c2 = coords[i + 1];
        if (c1 && c2) {
          dists.push(haversineKm(c1.lat, c1.lon, c2.lat, c2.lon));
        } else {
          dists.push(null);
        }
      }
      setDistances(dists);
    } finally {
      setLoadingDist(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const newOrder = [...order];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[index], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[index]];
    setOrder(newOrder);
    setDistances([]);
    setApplied(false);
  }

  function applyOrder() {
    order.forEach((act, i) => onReorder(act.id, i + 1));
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  }

  const totalDist = distances.reduce<number>((s, d) => s + (d ?? 0), 0);

  if (activitiesWithLocation.length === 0) {
    return (
      <div className="p-4 text-center text-white/30 text-sm">
        No activities with locations to optimize
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">Drag to reorder stops · distances are straight-line</p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => calculateDistances(order)}
            disabled={loadingDist}
          >
            <Route size={13} />
            {loadingDist ? "Calculating..." : "Calc Distances"}
          </Button>
          <Button size="sm" onClick={applyOrder} disabled={applied}>
            {applied ? <><Check size={13} />Applied!</> : "Apply Order"}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {order.map((act, i) => (
          <div key={act.id}>
            <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/5 px-3 py-2">
              <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{act.title}</p>
                <p className="text-xs text-white/40 flex items-center gap-1 truncate">
                  <MapPin size={10} className="shrink-0" />{act.location}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            </div>

            {distances[i] != null && i < order.length - 1 && (
              <div className="flex items-center gap-2 pl-6 py-0.5">
                <div className="w-px h-4 bg-indigo-500/20 ml-2.5" />
                <span className="text-xs text-indigo-400/60">≈ {distances[i]!.toFixed(1)} km</span>
              </div>
            )}
            {distances[i] === null && i < distances.length && i < order.length - 1 && (
              <div className="flex items-center gap-2 pl-6 py-0.5">
                <div className="w-px h-4 bg-white/10 ml-2.5" />
                <span className="text-xs text-white/25">distance unknown</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {totalDist > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-3 py-2">
          <Route size={14} className="text-indigo-400" />
          <span className="text-indigo-300 text-sm font-medium">Total route: ~{totalDist.toFixed(1)} km</span>
          <span className="text-white/30 text-xs">(straight-line)</span>
        </div>
      )}
    </div>
  );
}
