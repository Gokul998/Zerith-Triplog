"use client";
import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import type { Memory, Mood } from "@/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type FormData = Omit<Memory, "id" | "tripId" | "createdAt" | "updatedAt" | "imageIds">;
const moods: Mood[] = ["amazing", "great", "good", "okay", "bad"];
const moodEmoji: Record<Mood, string> = { amazing: "🤩", great: "😄", good: "😊", okay: "😐", bad: "😔" };

interface Props { onSave: (data: FormData, files: File[]) => Promise<void>; onCancel: () => void; }

export function MemoryForm({ onSave, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormData>({ title: "", date: new Date().toISOString().slice(0, 10), location: "", note: "", mood: null });
  const set = (k: string, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

  function handleFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const arr = Array.from(newFiles);
    setFiles(prev => [...prev, ...arr]);
    arr.forEach(f => { const url = URL.createObjectURL(f); setPreviews(prev => [...prev, url]); });
  }

  function removeFile(i: number) {
    URL.revokeObjectURL(previews[i]);
    setFiles(prev => prev.filter((_, j) => j !== i));
    setPreviews(prev => prev.filter((_, j) => j !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) return;
    setSaving(true);
    try { await onSave(form, files); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Title" id="mem-title" placeholder="Sunrise at Mt. Fuji" value={form.title} onChange={e => set("title", e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Date" id="mem-date" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
        <Input label="Location" id="mem-loc" placeholder="Kawaguchiko" value={form.location} onChange={e => set("location", e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-white/60">How was it?</label>
        <div className="flex gap-2">
          {moods.map(m => (
            <button type="button" key={m} onClick={() => set("mood", form.mood === m ? null : m)} className={`text-2xl p-1 rounded-lg transition-all ${form.mood === m ? "bg-indigo-500/20 scale-110 ring-1 ring-indigo-500/40" : "hover:bg-white/5"}`} title={m}>{moodEmoji[m]}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-white/60">Note</label>
        <textarea className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-indigo-500 focus:outline-none resize-none" rows={4} placeholder="Write about this moment..." value={form.note} onChange={e => set("note", e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-white/60">Photos</label>
        <div className="flex flex-wrap gap-2">
          {previews.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden">
              <img src={url} className="w-full h-full object-cover" alt="" />
              <button type="button" onClick={() => removeFile(i)} className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5"><X size={12} /></button>
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()} className="w-20 h-20 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-white/30 hover:border-indigo-500 hover:text-indigo-400 transition-colors">
            <Upload size={18} /><span className="text-xs mt-1">Add</span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving..." : "Save Memory"}</Button>
      </div>
    </form>
  );
}
