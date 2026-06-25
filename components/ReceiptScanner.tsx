"use client";
import { useRef, useState } from "react";
import { Camera, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

const CATEGORIES = ["accommodation", "transport", "food", "activities", "shopping", "health", "communication", "other"];

interface ExtractedData {
  title: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  merchant: string;
}

interface Props {
  tripId: string;
  currency: string;
  onAdded: () => void;
}

export function ReceiptScanner({ tripId, currency, onAdded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [data, setData] = useState<ExtractedData | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setData(null);
    setPreview(URL.createObjectURL(file));
    setScanning(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("tl_token");
      const res = await fetch(`${BASE}/api/trips/${tripId}/receipts/scan`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Scan failed" }));
        throw new Error(err.error || "Scan failed");
      }

      const extracted: ExtractedData = await res.json();
      setData({ ...extracted, currency: extracted.currency || currency });
    } catch (e: any) {
      setError(e.message || "Failed to scan receipt");
    } finally {
      setScanning(false);
    }
  }

  async function addExpense() {
    if (!data) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("tl_token");
      const res = await fetch(`${BASE}/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: data.title || data.merchant || "Receipt",
          amount: data.amount,
          currency: currency,
          category: data.category || "other",
          date: data.date || new Date().toISOString().slice(0, 10),
          notes: data.merchant ? `Merchant: ${data.merchant}` : "",
        }),
      });
      if (!res.ok) throw new Error("Failed to add expense");
      setData(null);
      setPreview(null);
      onAdded();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setData(null);
    setPreview(null);
    setError(null);
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-indigo-400" />
          <span className="font-semibold text-white text-sm">Receipt Scanner</span>
        </div>
        {(data || preview) && (
          <button onClick={reset} className="text-white/30 hover:text-white p-0.5 rounded">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {!scanning && !data && (
          <div
            className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all"
            onClick={() => fileRef.current?.click()}
          >
            <Camera size={32} className="mx-auto text-white/20 mb-2" />
            <p className="text-white/50 text-sm">Click to upload a receipt photo</p>
            <p className="text-white/25 text-xs mt-1">JPG, PNG, HEIC supported</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {scanning && (
          <div className="flex flex-col items-center gap-3 py-8">
            {preview && (
              <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/10 opacity-60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Receipt" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-2 text-indigo-400 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Extracting receipt data with AI...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-white text-xs underline">dismiss</button>
          </div>
        )}

        {data && (
          <div className="space-y-3">
            <div className="flex gap-3">
              {preview && (
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Receipt" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Extracted from receipt</p>
                {data.merchant && <p className="text-white/60 text-xs">{data.merchant}</p>}
              </div>
            </div>

            <Input
              label="Description"
              id="rs-title"
              value={data.title}
              onChange={e => setData(d => d ? { ...d, title: e.target.value } : d)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Amount"
                id="rs-amount"
                type="number"
                step="0.01"
                value={data.amount || ""}
                onChange={e => setData(d => d ? { ...d, amount: parseFloat(e.target.value) || 0 } : d)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-white/60">Currency</label>
                <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/60 font-medium">{currency}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-white/60">Category</label>
                <select
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                  value={data.category}
                  onChange={e => setData(d => d ? { ...d, category: e.target.value } : d)}
                >
                  {CATEGORIES.map(c => <option key={c} className="bg-gray-900">{c}</option>)}
                </select>
              </div>
              <Input
                label="Date"
                id="rs-date"
                type="date"
                value={data.date}
                onChange={e => setData(d => d ? { ...d, date: e.target.value } : d)}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" size="sm" className="flex-1" onClick={reset}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={addExpense} disabled={saving}>
                {saving ? <><Loader2 size={14} className="animate-spin" />Adding...</> : <><Plus size={14} />Add as Expense</>}
              </Button>
            </div>
          </div>
        )}

        {!scanning && !data && !error && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-center"
            onClick={() => fileRef.current?.click()}
          >
            <Camera size={14} />📷 Scan Receipt
          </Button>
        )}
      </div>
    </div>
  );
}
