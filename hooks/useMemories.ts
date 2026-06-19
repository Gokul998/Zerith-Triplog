"use client";
import { useCallback, useEffect, useState } from "react";
import type { Memory } from "@/types";
import { getSocket } from "@/lib/socket";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("tl_token") : null;
}

// Shape from API: memory + images array
export interface ApiMemory {
  id: string;
  trip_id: string;
  user_id: string;
  title: string;
  note: string;
  date: string;
  location: string;
  mood: string | null;
  created_at: string;
  updated_at: string;
  images: ApiImage[];
}

export interface ApiImage {
  id: string;
  memory_id: string;
  filename: string;
  mime_type: string;
}

export function imageUrl(filename: string) {
  return `${BASE}/api/uploads/${filename}`;
}

export function useMemories(tripId: string) {
  const [memories, setMemories] = useState<ApiMemory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/trips/${tripId}/memories`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await r.json();
      setMemories(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { load(); }, [load]);

  // Real-time sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onChanged = (data: { type: string; memory: ApiMemory }) => {
      if (data.type === "deleted") setMemories(prev => prev.filter(m => m.id !== data.memory.id));
      else if (data.type === "added") setMemories(prev => [data.memory, ...prev]);
      else if (data.type === "updated") setMemories(prev => prev.map(m => m.id === data.memory.id ? data.memory : m));
    };
    socket.on("memory-changed", onChanged);
    return () => { socket.off("memory-changed", onChanged); };
  }, []);

  const createMemory = useCallback(async (input: { title: string; note: string; date: string; location: string; mood?: string | null }, files: File[]) => {
    const formData = new FormData();
    formData.append("title", input.title);
    formData.append("note", input.note || "");
    formData.append("date", input.date);
    formData.append("location", input.location || "");
    if (input.mood) formData.append("mood", input.mood);
    for (const file of files) formData.append("images", file);

    const r = await fetch(`${BASE}/api/trips/${tripId}/memories`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const memory = await r.json();
    setMemories(prev => [memory, ...prev]);
    getSocket()?.emit("memory-change", { tripId, type: "added", memory });
    return memory;
  }, [tripId]);

  const updateMemory = useCallback(async (id: string, updates: Partial<{ title: string; note: string; date: string; location: string; mood: string | null }>, newFiles?: File[]) => {
    const formData = new FormData();
    if (updates.title !== undefined) formData.append("title", updates.title);
    if (updates.note !== undefined) formData.append("note", updates.note);
    if (updates.date !== undefined) formData.append("date", updates.date);
    if (updates.location !== undefined) formData.append("location", updates.location);
    if (updates.mood !== undefined) formData.append("mood", updates.mood ?? "");
    for (const file of newFiles || []) formData.append("images", file);

    const r = await fetch(`${BASE}/api/trips/${tripId}/memories/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const memory = await r.json();
    setMemories(prev => prev.map(m => m.id === id ? memory : m));
    getSocket()?.emit("memory-change", { tripId, type: "updated", memory });
  }, [tripId]);

  const deleteMemory = useCallback(async (id: string) => {
    await fetch(`${BASE}/api/trips/${tripId}/memories/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    setMemories(prev => prev.filter(m => m.id !== id));
    getSocket()?.emit("memory-change", { tripId, type: "deleted", memory: { id } });
  }, [tripId]);

  return { memories, loading, createMemory, updateMemory, deleteMemory };
}
