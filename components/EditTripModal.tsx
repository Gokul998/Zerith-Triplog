"use client";
import { useState } from "react";
import type { Trip } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Props { trip: Trip; onClose: () => void; onSave: (updates: Partial<Trip>) => Promise<Trip | undefined>; }

export function EditTripModal({ trip, onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: trip.title, destination: trip.destination, startDate: trip.startDate, endDate: trip.endDate, notes: trip.notes, status: trip.status });
  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); onClose(); } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title="Edit Trip">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Trip name" id="edit-title" value={form.title} onChange={e => set("title", e.target.value)} required />
        <Input label="Destination" id="edit-dest" value={form.destination} onChange={e => set("destination", e.target.value)} required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start date" id="edit-start" type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} required />
          <Input label="End date" id="edit-end" type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" value={form.status} onChange={e => set("status", e.target.value)}>
            <option value="planning">Planning</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Notes</label>
          <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none" rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>
    </Modal>
  );
}
