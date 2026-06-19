"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { AiPackingSuggestions } from "./AiPackingSuggestions";

const CATEGORIES = ["documents", "clothing", "electronics", "toiletries", "medicine", "money", "activities", "general"];
const CATEGORY_EMOJIS: Record<string, string> = { documents: "📄", clothing: "👕", electronics: "🔌", toiletries: "🧴", medicine: "💊", money: "💰", activities: "🎒", general: "📦" };

interface Item { id: string; text: string; checked: number; category: string; created_by_name: string; checked_by_name?: string; }

export function PackingChecklist({ tripId }: { tripId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [newText, setNewText] = useState("");
  const [newCat, setNewCat] = useState("general");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await apiGet<Item[]>(`/api/trips/${tripId}/checklist`);
    setItems(data);
    setLoading(false);
  }, [tripId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const s = getSocket();
    s.on("checklist-updated", (item: Item) => {
      setItems(prev => prev.map(i => i.id === item.id ? item : i));
    });
    return () => { s.off("checklist-updated"); };
  }, []);

  async function addItem() {
    if (!newText.trim()) return;
    const item = await apiPost<Item>(`/api/trips/${tripId}/checklist`, { text: newText.trim(), category: newCat });
    setItems(prev => [...prev, item]);
    setNewText("");
  }

  async function toggle(item: Item) {
    const updated = await apiPut<Item>(`/api/trips/${tripId}/checklist/${item.id}`, { checked: !item.checked });
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    getSocket().emit("checklist-update", { tripId, item: updated });
  }

  async function remove(id: string) {
    await apiDelete(`/api/trips/${tripId}/checklist/${id}`);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const grouped = CATEGORIES.reduce<Record<string, Item[]>>((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {});

  const total = items.length;
  const checked = items.filter(i => i.checked).length;

  return (
    <div className="bg-[#1e293b] rounded-2xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white flex items-center gap-2">🧳 Packing List</h3>
        {total > 0 && <span className="text-xs text-white/40">{checked}/{total} packed</span>}
      </div>

      {total > 0 && (
        <div className="h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all" style={{ width: `${(checked / total) * 100}%` }} />
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()} placeholder="Add item..." className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500" />
        <select value={newCat} onChange={e => setNewCat(e.target.value)} className="rounded-xl bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500">
          {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#1e293b]">{CATEGORY_EMOJIS[c]} {c}</option>)}
        </select>
        <button onClick={addItem} disabled={!newText.trim()} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-40 text-white rounded-xl px-3 text-sm"><Plus size={16} /></button>
      </div>

      <AiPackingSuggestions tripId={tripId} onAdded={load} />

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {CATEGORIES.filter(cat => grouped[cat]?.length > 0).map(cat => (
          <div key={cat}>
            <p className="text-xs font-medium text-white/40 uppercase tracking-wide mb-1">{CATEGORY_EMOJIS[cat]} {cat}</p>
            {grouped[cat].map(item => (
              <div key={item.id} className="flex items-center gap-2 py-1 group">
                <button onClick={() => toggle(item)} className={cn("shrink-0 transition-colors", item.checked ? "text-green-500" : "text-[#94a3b8] hover:text-[#64748b]")}>
                  {item.checked ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
                <span className={cn("flex-1 text-sm text-white/80", item.checked && "line-through text-white/30")}>{item.text}</span>
                <button onClick={() => remove(item.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        ))}
        {total === 0 && <p className="text-sm text-white/40 text-center py-4">No items yet. Add what you need to pack!</p>}
      </div>
    </div>
  );
}
