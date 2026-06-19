"use client";
import { useState } from "react";
import { Loader2, ChevronDown, ChevronUp, Plus, MapPin, ExternalLink } from "lucide-react";
import { apiGet } from "@/lib/api";

interface Restaurant {
  name: string;
  cuisine: string;
  address: string;
  rating?: number;
  ratingCount?: number;
  priceLevel?: number;
  openNow?: boolean;
  photo?: string | null;
  placeId?: string;
  mapsUrl?: string;
}

interface Props {
  tripId: string;
  destination: string;
  onSelect: (r: Restaurant) => void;
}

function PriceLevel({ level }: { level?: number }) {
  if (level == null) return null;
  const filled = "$".repeat(level);
  const empty = "$".repeat(4 - level);
  return (
    <span className="text-xs font-medium">
      <span className="text-green-400">{filled}</span>
      <span className="text-white/20">{empty}</span>
    </span>
  );
}

export function RestaurantFinder({ tripId, destination, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchUrl, setSearchUrl] = useState<string>("");
  const [error, setError] = useState("");

  async function load() {
    if (restaurants.length > 0) { setOpen(o => !o); return; }
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<{ restaurants: Restaurant[]; searchUrl?: string }>(
        `/api/trips/${tripId}/restaurants?destination=${encodeURIComponent(destination)}`
      );
      setRestaurants(data.restaurants ?? []);
      setSearchUrl(data.searchUrl ?? `https://www.google.com/maps/search/restaurants+in+${encodeURIComponent(destination)}`);
      setOpen(true);
    } catch {
      setError("Could not load restaurants");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#1e293b] rounded-2xl overflow-hidden border border-white/10">
      <button
        onClick={() => open ? setOpen(false) : load()}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="w-8 h-8 bg-orange-500/20 rounded-xl flex items-center justify-center shrink-0">
          {loading ? <Loader2 size={14} className="text-orange-400 animate-spin" /> : <span className="text-sm">🍽️</span>}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">🍽️ Nearby Restaurants</p>
          <p className="text-xs text-white/40">Restaurants near {destination}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
      </button>

      {open && (
        <div className="border-t border-white/10">
          {error && <p className="text-sm text-red-400 text-center py-4">{error}</p>}
          {restaurants.length === 0 && !loading && !error && (
            <p className="text-sm text-white/40 text-center py-6">No restaurants found near {destination}</p>
          )}
          <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
            {restaurants.map((r, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors group">
                {r.photo ? (
                  <img src={r.photo} alt={r.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 text-2xl">🍴</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    {r.cuisine && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/20">
                        {r.cuisine}
                      </span>
                    )}
                    {r.rating != null && (
                      <span className="text-xs text-white/50 flex items-center gap-0.5">
                        ⭐ {r.rating.toFixed(1)}
                        {r.ratingCount != null && <span className="text-white/30">({r.ratingCount.toLocaleString()})</span>}
                      </span>
                    )}
                    <PriceLevel level={r.priceLevel} />
                    {r.openNow != null && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${r.openNow ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {r.openNow ? "Open" : "Closed"}
                      </span>
                    )}
                  </div>
                  {r.address && (
                    <p className="text-xs text-white/30 flex items-center gap-0.5 mt-0.5 truncate">
                      <MapPin size={10} />{r.address}
                    </p>
                  )}
                  {r.mapsUrl && (
                    <a
                      href={r.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-xs text-indigo-400 hover:text-indigo-300 mt-0.5"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink size={10} /> View on Maps
                    </a>
                  )}
                </div>
                <button
                  onClick={() => onSelect(r)}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 rounded-lg px-2 py-1 transition-all shrink-0 mt-1"
                >
                  <Plus size={11} />
                  Add
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 px-4 py-2 flex justify-between items-center">
            <p className="text-xs text-white/30">📍 Google Places · {restaurants.length} restaurants</p>
            <div className="flex items-center gap-3">
              {searchUrl && (
                <a
                  href={searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                >
                  <ExternalLink size={10} /> Search All
                </a>
              )}
              <button onClick={() => { setRestaurants([]); setOpen(false); setTimeout(load, 100); }} className="text-xs text-indigo-400 hover:text-indigo-300">Refresh</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
