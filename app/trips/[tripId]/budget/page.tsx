"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Wallet, Settings, Sparkles, Loader2, X } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ExpenseSplitter } from "@/components/ExpenseSplitter";
import { CurrencyConverter } from "@/components/CurrencyConverter";
import { ExpenseExport } from "@/components/ExpenseExport";
import { ReceiptScanner } from "@/components/ReceiptScanner";
import { formatCurrency } from "@/lib/utils";

const CATEGORIES = ["accommodation","transport","food","activities","shopping","health","communication","other"];
const catColors: Record<string, string> = { accommodation:"bg-purple-100 text-purple-700", transport:"bg-blue-100 text-blue-700", food:"bg-orange-100 text-orange-700", activities:"bg-green-100 text-green-700", shopping:"bg-pink-100 text-pink-700", health:"bg-red-100 text-red-700", communication:"bg-yellow-100 text-yellow-700", other:"bg-gray-100 text-gray-600" };

export default function BudgetPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [allMembers, setAllMembers] = useState<{ id: string; name: string; avatar_color: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [expForm, setExpForm] = useState({ title: "", amount: "", category: "food", date: new Date().toISOString().slice(0, 10), notes: "", currency: "USD", paid_by: "", split_among: [] as string[] });
  const setE = (k: string, v: string) => setExpForm(p => ({ ...p, [k]: v }));
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  async function getInsights() {
    setInsightsLoading(true);
    setShowInsights(true);
    try {
      const { insights } = await apiPost<{ insights: string }>(`/api/trips/${tripId}/budget/insights`, {});
      setAiInsights(insights);
    } catch {
      setAiInsights("Failed to get insights. Please try again.");
    } finally {
      setInsightsLoading(false);
    }
  }

  const load = useCallback(async () => {
    const [t, e] = await Promise.all([apiGet<any>(`/api/trips/${tripId}`), apiGet<any[]>(`/api/trips/${tripId}/expenses`)]);
    setTrip(t);
    setExpenses(e);

    // Build full member list: owner + trip_members
    const members: { id: string; name: string; avatar_color: string }[] = [];
    if (t.owner) members.push({ id: t.owner.id, name: t.owner.name, avatar_color: t.owner.avatar_color });
    if (Array.isArray(t.members)) {
      for (const m of t.members) {
        if (!members.find(x => x.id === m.id)) members.push({ id: m.id, name: m.name, avatar_color: m.avatar_color });
      }
    }
    setAllMembers(members);

    // Detect current user from localStorage
    try {
      const raw = localStorage.getItem("tl_user");
      const uid = raw ? JSON.parse(raw)?.id ?? "" : "";
      setCurrentUserId(uid);
      setExpForm(p => ({
        ...p,
        currency: t.currency ?? "USD",
        paid_by: uid,
        split_among: members.map(m => m.id),
      }));
    } catch {
      setExpForm(p => ({
        ...p,
        currency: t.currency ?? "USD",
        split_among: members.map(m => m.id),
      }));
    }

    setLoading(false);
  }, [tripId]);

  useEffect(() => { load(); }, [load]);

  function toggleSplitMember(id: string) {
    setExpForm(p => {
      const already = p.split_among.includes(id);
      return { ...p, split_among: already ? p.split_among.filter(x => x !== id) : [...p.split_among, id] };
    });
  }

  function openAddExpense() {
    setExpForm(p => ({
      ...p,
      title: "",
      amount: "",
      notes: "",
      paid_by: currentUserId || (allMembers[0]?.id ?? ""),
      split_among: allMembers.map(m => m.id),
    }));
    setShowExpenseForm(true);
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    await apiPost(`/api/trips/${tripId}/expenses`, {
      ...expForm,
      amount: parseFloat(expForm.amount),
      currency,
      split_among: expForm.split_among,
    });
    load();
    setShowExpenseForm(false);
  }

  async function deleteExpense(id: string) {
    await apiDelete(`/api/trips/${tripId}/expenses/${id}`);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    await apiPut(`/api/trips/${tripId}`, { budget_amount: parseFloat(budgetInput) });
    load();
    setShowBudgetModal(false);
  }

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-white/5 rounded-2xl border border-white/10" /><div className="h-48 bg-white/5 rounded-2xl border border-white/10" /></div>;

  const currency = trip?.currency ?? "USD";
  const totalSpent = expenses.filter(e => e.currency === currency || !e.currency).reduce((s, e) => s + Number(e.amount), 0);
  const remaining = (trip?.budget_amount ?? 0) - totalSpent;
  const pct = trip?.budget_amount ? Math.min(100, (totalSpent / trip.budget_amount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#1e293b] rounded-2xl p-4 flex items-center justify-between border border-white/10">
        <div>
          <h2 className="text-lg font-bold text-white">Budget Tracker</h2>
          <p className="text-white/40 text-sm">{expenses.length} expense{expenses.length !== 1 ? "s" : ""} recorded</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={getInsights}><Sparkles size={14} />AI</Button>
          <Button variant="secondary" size="sm" onClick={() => { setBudgetInput(trip?.budget_amount ?? ""); setShowBudgetModal(true); }}><Settings size={14} />{trip?.budget_amount ? "Edit" : "Set"}</Button>
          <Button size="sm" onClick={openAddExpense}><Plus size={14} />Add</Button>
          <ExpenseExport expenses={expenses} trip={trip} />
        </div>
      </div>

      {trip?.budget_amount ? (
        <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
          <div className="grid grid-cols-3 gap-4 text-center mb-5">
            <div>
              <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Budget</p>
              <p className="text-xl font-bold text-white">{formatCurrency(trip.budget_amount, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Spent</p>
              <p className="text-xl font-bold text-indigo-400">{formatCurrency(totalSpent, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Left</p>
              <p className={`text-xl font-bold ${remaining < 0 ? "text-red-400" : "text-green-400"}`}>{formatCurrency(remaining, currency)}</p>
            </div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-red-400" : pct >= 80 ? "bg-amber-400" : "bg-gradient-to-r from-indigo-500 to-purple-500"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-white/30 mt-1.5">{Math.round(pct)}% of budget used</p>
        </div>
      ) : (
        <div className="bg-[#1e293b] rounded-2xl p-10 text-center border border-white/10">
          <Wallet size={40} className="mx-auto text-white/10 mb-3" />
          <p className="text-white/40">No budget set yet</p>
          <button onClick={() => setShowBudgetModal(true)} className="mt-3 text-indigo-400 text-sm hover:text-indigo-300">Set a budget →</button>
        </div>
      )}

      {showInsights && (
        <div className="bg-[#1e293b] rounded-2xl border border-purple-500/20 p-4 relative bg-purple-500/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
              <Sparkles size={16} />
              AI Budget Insights
            </div>
            <button onClick={() => setShowInsights(false)} className="text-white/30 hover:text-white p-0.5 rounded"><X size={16} /></button>
          </div>
          {insightsLoading ? (
            <div className="flex items-center gap-2 text-purple-400 text-sm py-2">
              <Loader2 size={16} className="animate-spin" />
              Analyzing your budget...
            </div>
          ) : (
            <p className="text-sm text-white/60 whitespace-pre-wrap leading-relaxed">{aiInsights}</p>
          )}
        </div>
      )}

      <ReceiptScanner tripId={tripId} currency={currency} members={allMembers} currentUserId={currentUserId} onAdded={load} />
      <ExpenseSplitter tripId={tripId} currency={currency} />

      <div className="bg-[#1e293b] rounded-2xl overflow-hidden border border-white/10">
        <h3 className="font-semibold text-white px-4 py-3 border-b border-white/10">Expenses ({expenses.length})</h3>
        {expenses.length === 0 ? (
          <p className="text-center text-white/40 text-sm py-8">No expenses recorded yet</p>
        ) : (
          <div className="divide-y divide-white/5">
            {expenses.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: e.paid_by_color ?? "#6366f1" }}>{(e.paid_by_name ?? "?")[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{e.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${catColors[e.category] ?? "bg-gray-500/20 text-gray-400"}`}>{e.category}</span>
                    <span className="text-xs text-white/40">{e.paid_by_name ?? "Unknown"} · {new Date(e.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <p className="font-semibold text-white shrink-0">{formatCurrency(e.amount, e.currency)}</p>
                <button onClick={() => deleteExpense(e.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400 text-xs">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CurrencyConverter />

      <Modal open={showExpenseForm} onClose={() => setShowExpenseForm(false)} title="Add Expense">
        <form onSubmit={addExpense} className="space-y-3">
          <Input label="Description" id="ex-title" value={expForm.title} onChange={e => setE("title", e.target.value)} required placeholder="Hotel check-in" />
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Input label="Amount" id="ex-amount" type="number" step="0.01" value={expForm.amount} onChange={e => setE("amount", e.target.value)} required /></div>
            <div className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 font-medium mb-[1px]">{currency}</div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-white/60">Category</label>
            <select className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none" value={expForm.category} onChange={e => setE("category", e.target.value)}>{CATEGORIES.map(c => <option key={c} className="bg-[#1e293b]">{c}</option>)}</select>
          </div>
          <Input label="Date" id="ex-date" type="date" value={expForm.date} onChange={e => setE("date", e.target.value)} />
          <Input label="Notes" id="ex-notes" value={expForm.notes} onChange={e => setE("notes", e.target.value)} placeholder="Optional note" />

          {allMembers.length > 0 && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-white/60">Paid by</label>
                <select
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  value={expForm.paid_by}
                  onChange={e => setE("paid_by", e.target.value)}
                >
                  {allMembers.map(m => <option key={m.id} value={m.id} className="bg-[#1e293b]">{m.name}{m.id === currentUserId ? " (you)" : ""}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white/60">Split among</label>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
                  {allMembers.map(m => (
                    <label key={m.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${expForm.split_among.includes(m.id) ? "bg-indigo-500 border-indigo-500" : "border-white/20 bg-transparent"}`} onClick={() => toggleSplitMember(m.id)}>
                        {expForm.split_among.includes(m.id) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: m.avatar_color ?? "#6366f1" }}>{m.name[0]}</div>
                      <span className="text-sm text-white/80">{m.name}{m.id === currentUserId ? " (you)" : ""}</span>
                    </label>
                  ))}
                </div>
                {expForm.split_among.length > 0 && (
                  <p className="text-xs text-white/30">Each person owes {formatCurrency(parseFloat(expForm.amount || "0") / expForm.split_among.length, currency)}</p>
                )}
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowExpenseForm(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Add</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showBudgetModal} onClose={() => setShowBudgetModal(false)} title="Set Budget">
        <form onSubmit={saveBudget} className="space-y-3">
          <Input label="Total budget" id="b-amount" type="number" step="0.01" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} required placeholder="3000" />
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowBudgetModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
