import type { Budget, Expense, ID, ImageAsset, ItineraryDay, Memory, Trip } from "@/types";
import type { StorageProvider } from "./types";

function lsGet<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function lsSet<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("trip-planner-blobs", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("blobs");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("blobs", "readwrite");
    tx.objectStore("blobs").put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("blobs", "readonly");
    const req = tx.objectStore("blobs").get(key);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("blobs", "readwrite");
    tx.objectStore("blobs").delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export class LocalStorageAdapter implements StorageProvider {
  // Trips
  async getTrips() { return lsGet<Trip>("tp:trips"); }
  async getTrip(id: ID) { return (await this.getTrips()).find(t => t.id === id) ?? null; }
  async saveTrip(trip: Trip) {
    const trips = await this.getTrips();
    const idx = trips.findIndex(t => t.id === trip.id);
    if (idx >= 0) trips[idx] = trip; else trips.push(trip);
    lsSet("tp:trips", trips);
  }
  async deleteTrip(id: ID) { lsSet("tp:trips", (await this.getTrips()).filter(t => t.id !== id)); }

  // Days
  async getDays(tripId: ID) { return lsGet<ItineraryDay>(`tp:days:${tripId}`); }
  async saveDay(day: ItineraryDay) {
    const days = await this.getDays(day.tripId);
    const idx = days.findIndex(d => d.id === day.id);
    if (idx >= 0) days[idx] = day; else days.push(day);
    lsSet(`tp:days:${day.tripId}`, days);
  }
  async deleteDay(id: ID) {
    const trips = await this.getTrips();
    for (const trip of trips) {
      const days = await this.getDays(trip.id);
      if (days.some(d => d.id === id)) {
        lsSet(`tp:days:${trip.id}`, days.filter(d => d.id !== id));
        break;
      }
    }
  }

  // Memories
  async getMemories(tripId: ID) { return lsGet<Memory>(`tp:memories:${tripId}`); }
  async saveMemory(memory: Memory) {
    const items = await this.getMemories(memory.tripId);
    const idx = items.findIndex(m => m.id === memory.id);
    if (idx >= 0) items[idx] = memory; else items.push(memory);
    lsSet(`tp:memories:${memory.tripId}`, items);
  }
  async deleteMemory(id: ID) {
    const trips = await this.getTrips();
    for (const trip of trips) {
      const items = await this.getMemories(trip.id);
      if (items.some(m => m.id === id)) {
        lsSet(`tp:memories:${trip.id}`, items.filter(m => m.id !== id));
        break;
      }
    }
  }

  // Images
  async getImageAssets(tripId: ID) { return lsGet<ImageAsset>(`tp:images:${tripId}`); }
  async getImageAsset(id: ID) {
    const trips = await this.getTrips();
    for (const trip of trips) {
      const assets = await this.getImageAssets(trip.id);
      const found = assets.find(a => a.id === id);
      if (found) return found;
    }
    return null;
  }
  async saveImageAsset(asset: ImageAsset) {
    const items = await this.getImageAssets(asset.tripId);
    const idx = items.findIndex(a => a.id === asset.id);
    if (idx >= 0) items[idx] = asset; else items.push(asset);
    lsSet(`tp:images:${asset.tripId}`, items);
  }
  async deleteImageAsset(id: ID) {
    const trips = await this.getTrips();
    for (const trip of trips) {
      const items = await this.getImageAssets(trip.id);
      if (items.some(a => a.id === id)) {
        lsSet(`tp:images:${trip.id}`, items.filter(a => a.id !== id));
        break;
      }
    }
  }
  async saveImageBlob(blobKey: string, blob: Blob) { await idbPut(blobKey, blob); }
  async getImageBlob(blobKey: string) { return idbGet(blobKey); }
  async deleteImageBlob(blobKey: string) { await idbDelete(blobKey); }

  // Budget
  async getBudget(tripId: ID) {
    const budgets = lsGet<Budget>("tp:budgets");
    return budgets.find(b => b.tripId === tripId) ?? null;
  }
  async saveBudget(budget: Budget) {
    const budgets = lsGet<Budget>("tp:budgets");
    const idx = budgets.findIndex(b => b.id === budget.id);
    if (idx >= 0) budgets[idx] = budget; else budgets.push(budget);
    lsSet("tp:budgets", budgets);
  }
  async getExpenses(tripId: ID) { return lsGet<Expense>(`tp:expenses:${tripId}`); }
  async saveExpense(expense: Expense) {
    const items = await this.getExpenses(expense.tripId);
    const idx = items.findIndex(e => e.id === expense.id);
    if (idx >= 0) items[idx] = expense; else items.push(expense);
    lsSet(`tp:expenses:${expense.tripId}`, items);
  }
  async deleteExpense(id: ID) {
    const trips = await this.getTrips();
    for (const trip of trips) {
      const items = await this.getExpenses(trip.id);
      if (items.some(e => e.id === id)) {
        lsSet(`tp:expenses:${trip.id}`, items.filter(e => e.id !== id));
        break;
      }
    }
  }
}
