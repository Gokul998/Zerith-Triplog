"use client";
import { useState } from "react";
import type { Budget } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Props { open: boolean; onClose: () => void; onSave: (data: Omit<Budget, "id" | "tripId">) => Promise<void>; initial?: Budget; }

export function BudgetSetupModal({ open, onClose, onSave, initial }: Props) {
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(initial?.totalAmount?.toString() ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await onSave({ totalAmount: parseFloat(amount), currency }); onClose(); } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Budget" : "Set Budget"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Total budget" id="budget-amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="3000" />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Currency</label>
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" value={currency} onChange={e => setCurrency(e.target.value)}>
            {["USD","EUR","GBP","JPY","INR","AUD","CAD","SGD","THB","MXN"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}
