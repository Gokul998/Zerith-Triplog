import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInDays, parseISO, eachDayOfInterval } from "date-fns";
import type { Trip } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string) {
  return format(parseISO(date), "MMM d, yyyy");
}

export function formatShortDate(date: string) {
  return format(parseISO(date), "MMM d");
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function tripDuration(trip: Trip): number {
  return differenceInDays(parseISO(trip.endDate), parseISO(trip.startDate)) + 1;
}

export function tripDays(trip: Trip): Date[] {
  return eachDayOfInterval({ start: parseISO(trip.startDate), end: parseISO(trip.endDate) });
}

export function generateId(): string {
  // Use nanoid pattern without importing to keep this file simple
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
