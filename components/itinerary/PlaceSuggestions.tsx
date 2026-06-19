"use client";
import { useState } from "react";
import { Sparkles, MapPin, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { ActivityCategory } from "@/types";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, string> = {
  sightseeing: "🏛️", food: "🍽️", accommodation: "🏨",
  activity: "🎯", shopping: "🛍️", transport: "🚌", other: "📍",
};

const CATEGORY_COLORS: Record<string, string> = {
  sightseeing: "bg-indigo-100 text-indigo-700 border-indigo-200",
  food: "bg-orange-100 text-orange-700 border-orange-200",
  accommodation: "bg-purple-100 text-purple-700 border-purple-200",
  activity: "bg-green-100 text-green-700 border-green-200",
  shopping: "bg-pink-100 text-pink-700 border-pink-200",
  other: "bg-gray-100 text-gray-600 border-gray-200",
};

interface Suggestion {
  name: string;
  category: string;
  location: string;
  description: string;
  lat?: number;
  lon?: number;
}

interface Props {
  tripId: string;
  destination: string;
  onSelect: (s: Suggestion) => void;
}

export function PlaceSuggestions({ tripId, destination, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [error, setError] = useState("");
  const [source, setSource] = useState<string>("gemini");

  async function load() {
    if (suggestions.length > 0) { setOpen(true); return; }
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<{ suggestions: Suggestion[]; source?: string }>(`/api/trips/${tripId}/suggestions?destination=${encodeURIComponent(destination)}`);
      setSuggestions(data.suggestions || []);
      setSource(data.source || "wikipedia");
      setOpen(true);
    } catch {
      setError("Could not load suggestions");
    } finally {
      setLoading(false);
    }
  }

  const categories = ["all", ...Array.from(new Set(suggestions.map(s => s.category)))];
  const filtered = filter === "all" ? suggestions : suggestions.filter(s => s.category === filter);

  return (
    <div className="bg-[#1e293b] rounded-2xl overflow-hidden border border-white/10">
      {/* Header button */}
      <button
        onClick={() => open ? setOpen(false) : load()}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
          {loading ? <Loader2 size={14} className="text-indigo-400 animate-spin" /> : <Sparkles size={14} className="text-indigo-400" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">✨ AI Place Suggestions</p>
          <p className="text-xs text-white/40">Top attractions & places near {destination}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
      </button>

      {open && (
        <div className="border-t border-white/10">
          {error && <p className="text-sm text-red-400 text-center py-4">{error}</p>}

          {/* Category filter chips */}
          {suggestions.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors",
                    filter === cat ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent" : "bg-white/5 text-white/50 border-white/10 hover:border-indigo-500/30 hover:text-indigo-300"
                  )}
                >
                  {cat === "all" ? "All" : `${CATEGORY_ICONS[cat] ?? "📍"} ${cat}`}
                </button>
              ))}
            </div>
          )}

          {/* Suggestions list */}
          <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
            {filtered.length === 0 && !loading && (
              <p className="text-sm text-white/40 text-center py-6">No places found for {destination}</p>
            )}
            {filtered.map((s, i) => (
              <button
                key={i}
                onClick={() => { onSelect(s); setOpen(false); }}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left group"
              >
                <div className="text-xl shrink-0 mt-0.5">{CATEGORY_ICONS[s.category] ?? "📍"}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors truncate">{s.name}</p>
                  {s.location && (
                    <p className="text-xs text-white/30 flex items-center gap-0.5 mt-0.5 truncate">
                      <MapPin size={10} />{s.location}
                    </p>
                  )}
                  {s.description && <p className="text-xs text-white/30 mt-0.5 line-clamp-1">{s.description}</p>}
                </div>
                <span className="text-xs px-1.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/50 shrink-0">
                  {s.category}
                </span>
              </button>
            ))}
          </div>

          {suggestions.length > 0 && (
            <div className="px-3 py-2 border-t border-white/10 flex justify-between items-center">
              <p className="text-xs text-white/30 flex items-center gap-1">
                {source === "gemini"
                  ? <><span className="text-indigo-400 font-medium">✨ Gemini AI</span> · {suggestions.length} places</>
                  : <>📍 Fallback · {suggestions.length} places (Gemini quota exceeded)</>}
              </p>
              <button onClick={() => { setSuggestions([]); load(); }} className="text-xs text-indigo-400 hover:text-indigo-300">Refresh</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
