"use client";
import { useState } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { apiPost } from "@/lib/api";

interface Props { tripId: string }

export function TripSummary({ tripId }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const { summary: s } = await apiPost<{ summary: string }>(`/api/trips/${tripId}/summary`, {});
      setSummary(s);
    } catch {
      setError("Failed to generate summary. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-[#1e293b] rounded-2xl p-5 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <Sparkles size={14} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Trip Story</h3>
            <p className="text-xs text-white/40">AI-generated travel narrative</p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white rounded-xl px-3 py-1.5 font-medium transition-all"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {loading ? "Generating…" : summary ? "Regenerate" : "✨ Generate Trip Story"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 py-2">{error}</p>}

      {summary && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 mt-2">
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{summary}</p>
          <button
            onClick={copy}
            className="mt-3 flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
      )}

      {!summary && !loading && !error && (
        <p className="text-xs text-white/30 text-center py-4">
          Generate a beautiful narrative summary of your trip based on activities and memories.
        </p>
      )}
    </div>
  );
}
