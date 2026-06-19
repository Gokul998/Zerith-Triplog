"use client";
import { useCallback, useEffect, useState } from "react";
import { useStorage } from "@/contexts/StorageContext";
import type { Trip } from "@/types";
import { generateId } from "@/lib/utils";

export function useTrips() {
  const storage = useStorage();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await storage.getTrips();
    setTrips(data.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setLoading(false);
  }, [storage]);

  useEffect(() => { load(); }, [load]);

  const createTrip = useCallback(async (input: Omit<Trip, "id" | "createdAt" | "updatedAt">) => {
    const trip: Trip = { ...input, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await storage.saveTrip(trip);
    setTrips(prev => [trip, ...prev]);
    return trip;
  }, [storage]);

  const updateTrip = useCallback(async (id: string, updates: Partial<Trip>) => {
    const existing = await storage.getTrip(id);
    if (!existing) return;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await storage.saveTrip(updated);
    setTrips(prev => prev.map(t => t.id === id ? updated : t));
    return updated;
  }, [storage]);

  const deleteTrip = useCallback(async (id: string) => {
    await storage.deleteTrip(id);
    setTrips(prev => prev.filter(t => t.id !== id));
  }, [storage]);

  return { trips, loading, createTrip, updateTrip, deleteTrip, reload: load };
}

export function useTrip(id: string) {
  const storage = useStorage();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getTrip(id).then(t => { setTrip(t); setLoading(false); });
  }, [storage, id]);

  const updateTrip = useCallback(async (updates: Partial<Trip>) => {
    if (!trip) return;
    const updated = { ...trip, ...updates, updatedAt: new Date().toISOString() };
    await storage.saveTrip(updated);
    setTrip(updated);
    return updated;
  }, [storage, trip]);

  return { trip, loading, updateTrip };
}
