"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Plus, Camera } from "lucide-react";
import { useMemories } from "@/hooks/useMemories";
import { Button } from "@/components/ui/Button";
import { MemoryCard } from "@/components/memories/MemoryCard";
import { MemoryForm } from "@/components/memories/MemoryForm";
import { DrivePanel } from "@/components/memories/DrivePanel";
import { QuickCapture } from "@/components/memories/QuickCapture";
import { Modal } from "@/components/ui/Modal";

export default function MemoriesPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { memories, loading, createMemory, deleteMemory } = useMemories(tripId);
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      {/* Header */}
      <div className="bg-[#1e293b] rounded-2xl p-4 mb-6 flex items-center justify-between border border-white/10">
        <div>
          <h2 className="text-lg font-bold text-white">Memories</h2>
          <p className="text-white/40 text-sm">{memories.length} captured moment{memories.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus size={16} />Add Memory</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-white/5 animate-pulse rounded-2xl border border-white/10" />)}
        </div>
      ) : memories.length === 0 ? (
        <div className="bg-[#1e293b] rounded-2xl text-center py-20 border border-white/10">
          <Camera size={48} className="mx-auto text-white/10 mb-4" />
          <h3 className="text-white/50 font-semibold mb-1">No memories yet</h3>
          <p className="text-white/30 text-sm">Capture photos and notes from your trip!</p>
          <p className="text-white/20 text-xs mt-2">Use the ⚡ button to quickly capture a moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {memories.map(memory => (
            <MemoryCard key={memory.id} memory={memory} onDelete={() => deleteMemory(memory.id)} />
          ))}
        </div>
      )}

      <div className="mt-6">
        <DrivePanel tripId={tripId} memories={memories} />
      </div>

      {/* Quick Capture FAB */}
      <QuickCapture
        onCapture={async (data, files) => {
          await createMemory({ title: data.title, note: data.note, date: data.date, location: data.location, mood: "good" }, files);
        }}
      />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Memory" className="max-w-xl">
        <MemoryForm
          onSave={async (data, files) => {
            await createMemory({ title: data.title, note: data.note, date: data.date, location: data.location, mood: data.mood }, files);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
