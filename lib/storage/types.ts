import type { Budget, Expense, ID, ImageAsset, ItineraryDay, Memory, Trip } from "@/types";

export interface StorageProvider {
  getTrips(): Promise<Trip[]>;
  getTrip(id: ID): Promise<Trip | null>;
  saveTrip(trip: Trip): Promise<void>;
  deleteTrip(id: ID): Promise<void>;

  getDays(tripId: ID): Promise<ItineraryDay[]>;
  saveDay(day: ItineraryDay): Promise<void>;
  deleteDay(id: ID): Promise<void>;

  getMemories(tripId: ID): Promise<Memory[]>;
  saveMemory(memory: Memory): Promise<void>;
  deleteMemory(id: ID): Promise<void>;

  getImageAssets(tripId: ID): Promise<ImageAsset[]>;
  getImageAsset(id: ID): Promise<ImageAsset | null>;
  saveImageAsset(asset: ImageAsset): Promise<void>;
  deleteImageAsset(id: ID): Promise<void>;
  saveImageBlob(blobKey: string, blob: Blob): Promise<void>;
  getImageBlob(blobKey: string): Promise<Blob | null>;
  deleteImageBlob(blobKey: string): Promise<void>;

  getBudget(tripId: ID): Promise<Budget | null>;
  saveBudget(budget: Budget): Promise<void>;
  getExpenses(tripId: ID): Promise<Expense[]>;
  saveExpense(expense: Expense): Promise<void>;
  deleteExpense(id: ID): Promise<void>;
}
