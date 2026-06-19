export type ID = string;

export type TripStatus = "planning" | "active" | "completed" | "cancelled";
export type ActivityCategory = "transport" | "accommodation" | "food" | "sightseeing" | "activity" | "shopping" | "other";
export type ExpenseCategory = "accommodation" | "transport" | "food" | "activities" | "shopping" | "health" | "communication" | "other";
export type Mood = "amazing" | "great" | "good" | "okay" | "bad";

export interface Trip {
  id: ID;
  title: string;
  destination: string;
  coverImageId: ID | null;
  startDate: string;
  endDate: string;
  status: TripStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryDay {
  id: ID;
  tripId: ID;
  date: string;
  dayNumber: number;
  title: string;
  activities: Activity[];
}

export interface Activity {
  id: ID;
  dayId: ID;
  tripId: ID;
  title: string;
  description: string;
  startTime: string | null;
  endTime: string | null;
  location: string;
  category: ActivityCategory;
  cost: number;
  currency: string;
  status: "planned" | "completed" | "skipped";
  order: number;
}

export interface Memory {
  id: ID;
  tripId: ID;
  date: string;
  location: string;
  title: string;
  note: string;
  imageIds: ID[];
  mood: Mood | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImageAsset {
  id: ID;
  tripId: ID;
  memoryId: ID | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  blobKey: string;
  thumbnailBlobKey: string;
  createdAt: string;
}

export interface Budget {
  id: ID;
  tripId: ID;
  totalAmount: number;
  currency: string;
}

export interface Expense {
  id: ID;
  tripId: ID;
  budgetId: ID;
  title: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  date: string;
  notes: string;
  createdAt: string;
}
