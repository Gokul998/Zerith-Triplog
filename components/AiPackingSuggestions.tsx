"use client";
import { useState } from "react";
import { Sparkles, Loader2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { apiPost } from "@/lib/api";

const CATEGORY_EMOJIS: Record<string, string> = {
  documents: "📄", clothing: "👕", electronics: "🔌", toiletries: "🧴",
  medicine: "💊", money: "💰", activities: "🎒", general: "📦",
};

interface Suggestion { category: string; items: string[] }

interface Props {
  tripId: string;
  onAdded: () => void;
}

export function AiPackingSuggestions({ tripId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function fetchSuggestions() {
    if (suggestions.length > 0) { setOpen(o => !o); return; }
    setLoading(true);
    setError("");
    try {
      const { suggestions: s } = await apiPost<{ suggestions: Suggestion[] }>(
        `/api/trips/${tripId}/packing/suggest`, {}
      );
      setSuggestions(s ?? []);
      setOpen(true);
    } catch {
      setError("Failed to get suggestions. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function addItem(text: string, category: string) {
    const key = `${category}:${text}`;
    setAdding(key);
    try {
      await apiPost(`/api/trips/${tripId}/checklist`, { text, category });
      onAdded();
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 mt-3">
      <button
        onClick={fetchSuggestions}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center shrink-0">
          {loading ? <Loader2 size={14} className="text-purple-400 animate-spin" /> : <Sparkles size={14} className="text-purple-400" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">✨ AI Suggest Packing</p>
          <p className="text-xs text-white/40">Get AI-powered packing suggestions for your trip</p>
        </div>
        {open ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
      </button>

      {open && (
        <div className="border-t border-white/10">
          {error && <p className="text-sm text-red-400 text-center py-4">{error}</p>}
          {suggestions.length === 0 && !loading && !error && (
            <p className="text-sm text-white/40 text-center py-6">No suggestions yet</p>
          )}
          <div className="max-h-72 overflow-y-auto divide-y divide-white/5 px-2 py-2 space-y-3">
            {suggestions.map((cat) => (
              <div key={cat.category} className="pb-2">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wide px-2 mb-1.5">
                  {CATEGORY_EMOJIS[cat.category] ?? "📦"} {cat.category}
                </p>
                <div className="flex flex-wrap gap-1.5 px-2">
                  {cat.items.map((item) => {
                    const key = `${cat.category}:${item}`;
                    return (
                      <button
                        key={item}
                        onClick={() => addItem(item, cat.category)}
                        disabled={adding === key}
                        className="flex items-center gap-1 text-xs bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/30 text-white/60 hover:text-indigo-300 rounded-full px-2.5 py-1 transition-colors disabled:opacity-50"
                      >
                        {adding === key ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {suggestions.length > 0 && (
            <div className="border-t border-white/10 px-4 py-2 flex justify-between items-center">
              <p className="text-xs text-purple-400">✨ Gemini AI · {suggestions.reduce((a, c) => a + c.items.length, 0)} suggestions</p>
              <button onClick={() => { setSuggestions([]); setOpen(false); setTimeout(fetchSuggestions, 100); }} className="text-xs text-indigo-400 hover:text-indigo-300">Refresh</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
