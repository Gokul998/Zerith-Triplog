"use client";
import { useState } from "react";
import type { Expense, ExpenseCategory } from "@/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type FormData = Omit<Expense, "id" | "tripId" | "budgetId" | "createdAt">;
const categories: ExpenseCategory[] = ["accommodation", "transport", "food", "activities", "shopping", "health", "communication", "other"];

interface Props { currency: string; onSave: (data: FormData) => Promise<void>; onCancel: () => void; }

export function ExpenseForm({ currency, onSave, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormData>({ title: "", amount: 0, currency, category: "food", date: new Date().toISOString().slice(0, 10), notes: "" });
  const set = (k: string, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.amount) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Description" id="exp-title" placeholder="Hotel check-in" value={form.title} onChange={e => set("title", e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Amount" id="exp-amount" type="number" step="0.01" value={form.amount || ""} onChange={e => set("amount", parseFloat(e.target.value) || 0)} required />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" value={form.category} onChange={e => set("category", e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <Input label="Date" id="exp-date" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
      <Input label="Notes (optional)" id="exp-notes" placeholder="Business dinner with team" value={form.notes} onChange={e => set("notes", e.target.value)} />
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving..." : "Add Expense"}</Button>
      </div>
    </form>
  );
}
