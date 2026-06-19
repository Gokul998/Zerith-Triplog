"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Trip } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useStorage } from "@/contexts/StorageContext";
import { generateId } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (data: Omit<Trip, "id" | "createdAt" | "updatedAt">) => Promise<Trip>;
}

export function CreateTripModal({ open, onClose, onCreate }: Props) {
  const router = useRouter();
  const storage = useStorage();
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState("");
  const [form, setForm] = useState({ title: "", destination: "", startDate: "", endDate: "", notes: "", totalBudget: "", currency: "USD" });

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setDateError("End date must be after start date");
      return;
    }
    setDateError("");
    setSaving(true);
    try {
      const trip = await onCreate({ title: form.title, destination: form.destination, startDate: form.startDate, endDate: form.endDate, notes: form.notes, status: "planning", coverImageId: null });
      if (form.totalBudget) {
        await storage.saveBudget({ id: generateId(), tripId: trip.id, totalAmount: parseFloat(form.totalBudget), currency: form.currency });
      }
      onClose();
      router.push(`/trips/${trip.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Trip">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Trip name" id="title" placeholder="Summer in Japan" value={form.title} onChange={e => set("title", e.target.value)} required />
        <Input label="Destination" id="destination" placeholder="Tokyo, Japan" value={form.destination} onChange={e => set("destination", e.target.value)} required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start date" id="startDate" type="date" value={form.startDate} onChange={e => { set("startDate", e.target.value); setDateError(""); }} required />
          <Input label="End date" id="endDate" type="date" value={form.endDate} min={form.startDate} onChange={e => { set("endDate", e.target.value); setDateError(""); }} required />
        </div>
        <div className="flex gap-3">
          <div className="flex-1"><Input label="Budget" id="budget" type="number" placeholder="2000" value={form.totalBudget} onChange={e => set("totalBudget", e.target.value)} /></div>
          <div className="w-28">
            <label className="text-sm font-medium text-gray-700 block mb-1">Currency</label>
            <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" value={form.currency} onChange={e => set("currency", e.target.value)}>
              <option>USD</option><option>EUR</option><option>GBP</option><option>JPY</option><option>INR</option><option>AUD</option><option>CAD</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Notes</label>
          <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none" rows={3} placeholder="Trip ideas, reminders..." value={form.notes} onChange={e => set("notes", e.target.value)} />
        </div>
        {dateError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{dateError}</p>}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Creating..." : "Create Trip"}</Button>
        </div>
      </form>
    </Modal>
  );
}
