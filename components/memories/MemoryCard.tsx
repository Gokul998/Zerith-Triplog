"use client";
import { useState } from "react";
import { MapPin, Calendar, Trash2 } from "lucide-react";
import type { Mood } from "@/types";
import { formatDate } from "@/lib/utils";
import type { ApiMemory } from "@/hooks/useMemories";
import { imageUrl } from "@/hooks/useMemories";

const moodEmoji: Record<Mood, string> = { amazing: "🤩", great: "😄", good: "😊", okay: "😐", bad: "😔" };

interface Props { memory: ApiMemory; onDelete: () => void; }

export function MemoryCard({ memory, onDelete }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const images = memory.images || [];

  return (
    <div className="bg-[#1e293b] rounded-2xl overflow-hidden group border border-white/10 hover:border-white/20 transition-all">
      {images.length > 0 && (
        <div className={`grid gap-0.5 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {images.slice(0, 4).map((img, i) => (
            <div key={img.id} className={`relative overflow-hidden bg-white/5 ${images.length === 1 ? "h-48" : "h-28"}`} onClick={() => setLightbox(imageUrl(img.filename))}>
              <img src={imageUrl(img.filename)} alt="" className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" />
              {i === 3 && images.length > 4 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg">+{images.length - 4}</div>}
            </div>
          ))}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">{memory.title}</h3>
              {memory.mood && <span title={memory.mood}>{moodEmoji[memory.mood as Mood]}</span>}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-white/40 mt-1">
              {memory.location && <span className="flex items-center gap-0.5"><MapPin size={10} />{memory.location}</span>}
              <span className="flex items-center gap-0.5"><Calendar size={10} />{formatDate(memory.date)}</span>
            </div>
          </div>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
        </div>
        {memory.note && <p className="text-sm text-white/50 mt-2 line-clamp-3">{memory.note}</p>}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded" />
        </div>
      )}
    </div>
  );
}
