"use client";
import { useState } from "react";
import { Link2, Copy, Check, RefreshCw, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface Props {
  tripId: string;
}

export function ShareTrip({ tripId }: Props) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [disabled, setDisabled] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const data = await api<{ shareUrl: string; token: string }>(`/api/trips/${tripId}/share`, { method: "POST" });
      setShareUrl(data.shareUrl);
      setDisabled(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function disableShare() {
    setLoading(true);
    try {
      await api(`/api/trips/${tripId}/share`, { method: "DELETE" });
      setShareUrl(null);
      setDisabled(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  function copyUrl() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpen() {
    setOpen(true);
    if (!shareUrl && !disabled) generate();
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={handleOpen}>
        <Link2 size={13} /> Share Trip
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-6 w-full max-w-md border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Link2 size={16} className="text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Share Trip</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors"><X size={18} /></button>
            </div>
            <p className="text-white/50 text-sm mb-4">Anyone with the link can view this trip — read-only, no account required.</p>
            {loading && <div className="text-center py-6 text-white/40 text-sm">Generating link...</div>}
            {!loading && shareUrl && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-indigo-300 font-mono truncate">{shareUrl}</div>
                  <button onClick={copyUrl} className="px-3 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 transition-colors flex items-center gap-1.5 text-sm font-medium">
                    {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={generate} className="flex-1 flex items-center justify-center gap-1.5 text-sm text-white/50 hover:text-white py-2 rounded-xl hover:bg-white/5 transition-colors"><RefreshCw size={12} /> Regenerate</button>
                  <button onClick={disableShare} className="flex-1 flex items-center justify-center gap-1.5 text-sm text-red-400 hover:text-red-300 py-2 rounded-xl hover:bg-red-500/10 transition-colors"><X size={12} /> Disable</button>
                </div>
              </div>
            )}
            {!loading && !shareUrl && (
              <div className="text-center py-2 space-y-3">
                {disabled && <p className="text-white/40 text-sm">Sharing is currently disabled.</p>}
                <Button onClick={generate} className="w-full"><Link2 size={14} /> Generate Share Link</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
