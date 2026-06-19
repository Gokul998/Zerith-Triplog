"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Sparkles, Map } from "lucide-react";
import type { Activity, ItineraryDay } from "@/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ActivityItem } from "./ActivityItem";
import { ActivityForm } from "./ActivityForm";
import { RouteOptimizer } from "@/components/RouteOptimizer";

interface Props {
  day: ItineraryDay;
  prefill?: Partial<Activity>;
  onAddActivity: (input: Omit<Activity, "id" | "dayId" | "tripId" | "order">) => void;
  onUpdateActivity: (id: string, updates: Partial<Activity>) => void;
  onDeleteActivity: (id: string) => void;
  onUpdateTitle: (title: string) => void;
}

export function DayCard({ day, prefill, onAddActivity, onUpdateActivity, onDeleteActivity, onUpdateTitle }: Props) {
  const [open, setOpen] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(day.title);
  const [showRoute, setShowRoute] = useState(false);
  const totalCost = day.activities.reduce((s, a) => s + a.cost, 0);

  function commitTitle() {
    setEditingTitle(false);
    if (titleInput !== day.title) onUpdateTitle(titleInput);
  }

  function handleAddClick() {
    setOpen(true);
    setShowForm(true);
  }

  return (
    <div className={`bg-[#1e293b] rounded-2xl overflow-hidden transition-all border ${prefill ? "border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "border-white/10"}`}>
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl w-10 h-10 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">D{day.dayNumber}</div>
        <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
          {editingTitle ? (
            <input className="font-semibold text-[#1e2044] bg-transparent border-b border-indigo-400 outline-none w-full" value={titleInput} onChange={e => setTitleInput(e.target.value)} onBlur={commitTitle} onKeyDown={e => e.key === "Enter" && commitTitle()} autoFocus />
          ) : (
            <p className="font-semibold text-white truncate cursor-text" onDoubleClick={() => setEditingTitle(true)}>{day.title}</p>
          )}
          <p className="text-xs text-white/40">{formatDate(day.date)} · {day.activities.length} activities{totalCost > 0 ? ` · ₹${totalCost.toFixed(0)}` : ""}</p>
        </div>
        <button
          className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-indigo-400 transition-colors shrink-0"
          onClick={e => { e.stopPropagation(); setShowRoute(r => !r); setOpen(true); }}
          title="Route optimizer"
        >
          <Map size={15} />
        </button>
        <div className="text-white/30">{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
      </div>

      {open && showRoute && (
        <div className="border-t border-white/10 p-4 bg-indigo-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Map size={14} className="text-indigo-400" />
            <span className="text-indigo-300 text-sm font-semibold">Route Optimizer</span>
          </div>
          <RouteOptimizer
            day={day}
            onReorder={(actId, newOrder) => onUpdateActivity(actId, { order: newOrder })}
          />
        </div>
      )}

      {open && (
        <div className="border-t border-white/10">
          {day.activities.length === 0 && !showForm && (
            <p className="text-sm text-white/30 text-center py-6">No activities yet</p>
          )}
          {day.activities.map(act => (
            <ActivityItem key={act.id} activity={act} onUpdate={(u) => onUpdateActivity(act.id, u)} onDelete={() => onDeleteActivity(act.id)} />
          ))}
          {showForm && (
            <div className="p-4 border-t border-white/10">
              <ActivityForm
                initial={prefill}
                onSave={data => { onAddActivity(data); setShowForm(false); }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}
          <div className="p-3 border-t border-white/10">
            <Button
              variant={prefill ? "primary" : "ghost"}
              size="sm"
              className="w-full justify-center"
              onClick={handleAddClick}
            >
              {prefill ? <><Sparkles size={14} />Add "{prefill.title?.slice(0, 20)}{(prefill.title?.length ?? 0) > 20 ? "…" : ""}" here</> : <><Plus size={14} />Add Activity</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
