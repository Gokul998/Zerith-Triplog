"use client";
import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, BookOpen, MapPin } from "lucide-react";
import { apiPost } from "@/lib/api";

interface Props { tripId: string }

export function TripSummary({ tripId }: Props) {
  const [story, setStory] = useState<string | null>(null);
  const [guide, setGuide] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"story" | "guide">("story");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const { summary: s } = await apiPost<{ summary: string }>(`/api/trips/${tripId}/summary`, {});
      const parts = s.split("---DESTINATION GUIDE---");
      setStory(parts[0]?.trim() || s);
      setGuide(parts[1]?.trim() || null);
      setTab("story");
    } catch {
      setError("Failed to generate. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    const text = tab === "story" ? story : guide;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const hasContent = story || guide;

  return (
    <div className="bg-[#1e293b] rounded-2xl p-5 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <Sparkles size={14} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Trip Story & Destination Guide</h3>
            <p className="text-xs text-white/40">AI-generated narrative + cultural history</p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white rounded-xl px-3 py-1.5 font-medium transition-all"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {loading ? "Generating…" : hasContent ? "Regenerate" : "✨ Generate"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 py-2">{error}</p>}

      {hasContent && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-3 bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setTab("story")}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-all ${tab === "story" ? "bg-amber-500/20 text-amber-400" : "text-white/40 hover:text-white"}`}
            >
              <BookOpen size={12} /> Trip Story
            </button>
            <button
              onClick={() => setTab("guide")}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-all ${tab === "guide" ? "bg-indigo-500/20 text-indigo-400" : "text-white/40 hover:text-white"}`}
            >
              <MapPin size={12} /> Destination Guide
            </button>
          </div>

          <div className={`rounded-xl p-4 border ${tab === "story" ? "bg-amber-500/10 border-amber-500/20" : "bg-indigo-500/10 border-indigo-500/20"}`}>
            <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">
              {tab === "story" ? story : guide}
            </p>
            <button
              onClick={copy}
              className={`mt-3 flex items-center gap-1.5 text-xs transition-colors ${tab === "story" ? "text-amber-400 hover:text-amber-300" : "text-indigo-400 hover:text-indigo-300"}`}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
          </div>
        </>
      )}

      {!hasContent && !loading && !error && (
        <p className="text-xs text-white/30 text-center py-4">
          Generate a trip narrative + detailed cultural guide for your destination.
        </p>
      )}
    </div>
  );
}
