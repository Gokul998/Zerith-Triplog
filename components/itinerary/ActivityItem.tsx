"use client";
import { useState } from "react";
import { Trash2, Edit, Clock, MapPin, DollarSign } from "lucide-react";
import type { Activity, ActivityCategory } from "@/types";
import { cn } from "@/lib/utils";
import { ActivityForm } from "./ActivityForm";

const categoryColors: Record<ActivityCategory, string> = {
  transport: "bg-blue-100 text-blue-700",
  accommodation: "bg-purple-100 text-purple-700",
  food: "bg-orange-100 text-orange-700",
  sightseeing: "bg-green-100 text-green-700",
  activity: "bg-yellow-100 text-yellow-700",
  shopping: "bg-pink-100 text-pink-700",
  other: "bg-gray-100 text-gray-600",
};

interface Props { activity: Activity; onUpdate: (u: Partial<Activity>) => void; onDelete: () => void; }

export function ActivityItem({ activity, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="p-4 border-b border-white/10">
        <ActivityForm initial={activity} onSave={data => { onUpdate(data); setEditing(false); }} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-3 p-4 border-b border-white/5 group hover:bg-white/5 transition-colors", activity.status === "completed" && "opacity-60")}>
      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5", categoryColors[activity.category])}>{activity.category}</span>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium text-white", activity.status === "completed" && "line-through text-white/30")}>{activity.title}</p>
        <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-white/40">
          {activity.startTime && <span className="flex items-center gap-0.5"><Clock size={10} />{activity.startTime}{activity.endTime && ` – ${activity.endTime}`}</span>}
          {activity.location && <span className="flex items-center gap-0.5"><MapPin size={10} />{activity.location}</span>}
          {activity.cost > 0 && <span className="flex items-center gap-0.5"><DollarSign size={10} />{activity.cost}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onUpdate({ status: activity.status === "completed" ? "planned" : "completed" })} className="p-1 rounded hover:bg-white/10 text-white/40 text-xs">{activity.status === "completed" ? "↩" : "✓"}</button>
        <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-white/10 text-white/40"><Edit size={14} /></button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-red-500/10 text-red-400"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
