"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import type { Activity, ItineraryDay } from "@/types";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { getSocket } from "@/lib/socket";

function normTrip(trip: any): { id: string; startDate: string; endDate: string } {
  return {
    id: trip.id,
    startDate: trip.startDate ?? trip.start_date,
    endDate: trip.endDate ?? trip.end_date,
  };
}

function buildDays(tripId: string, startDate: string, endDate: string, activities: any[]): ItineraryDay[] {
  const dateRange = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
  return dateRange.map((date, i) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayActivities = activities
      .filter(a => a.day_id === dateStr)
      .map(a => ({
        id: a.id,
        dayId: a.day_id,
        tripId: a.trip_id,
        title: a.title,
        description: a.description,
        startTime: a.start_time,
        endTime: a.end_time,
        location: a.location,
        category: a.category,
        cost: a.cost,
        currency: a.currency,
        status: a.status,
        order: a.sort_order,
      } as Activity));
    return {
      id: dateStr,
      tripId,
      date: dateStr,
      dayNumber: i + 1,
      title: `Day ${i + 1}`,
      activities: dayActivities.sort((a, b) => a.order - b.order),
    } as ItineraryDay;
  });
}

export function useItinerary(trip: any) {
  const { id: tripId, startDate, endDate } = trip ? normTrip(trip) : { id: "", startDate: "", endDate: "" };
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const rawActivities = useRef<any[]>([]);

  const rebuild = useCallback((activities: any[]) => {
    rawActivities.current = activities;
    setDays(buildDays(tripId, startDate, endDate, activities));
  }, [tripId, startDate, endDate]);

  const load = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const activities = await apiGet<any[]>(`/api/trips/${tripId}/itinerary`);
      rebuild(activities);
    } finally {
      setLoading(false);
    }
  }, [tripId, rebuild]);

  useEffect(() => { load(); }, [load]);

  // Real-time socket sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onChanged = (data: { type: string; activity: any }) => {
      if (data.type === "deleted") {
        rebuild(rawActivities.current.filter(a => a.id !== data.activity.id));
      } else if (data.type === "added") {
        rebuild([...rawActivities.current, data.activity]);
      } else if (data.type === "updated") {
        rebuild(rawActivities.current.map(a => a.id === data.activity.id ? data.activity : a));
      }
    };
    socket.on("itinerary-changed", onChanged);
    return () => { socket.off("itinerary-changed", onChanged); };
  }, [rebuild]);

  const addActivity = useCallback(async (dayId: string, input: Omit<Activity, "id" | "dayId" | "tripId" | "order">) => {
    const activity = await apiPost<any>(`/api/trips/${tripId}/itinerary/activities`, {
      date: dayId,
      title: input.title,
      description: input.description,
      location: input.location,
      category: input.category,
      start_time: input.startTime,
      end_time: input.endTime,
      cost: input.cost,
      currency: input.currency,
      status: input.status,
    });
    rebuild([...rawActivities.current, activity]);
    const socket = getSocket();
    socket?.emit("itinerary-change", { tripId, type: "added", activity });
  }, [tripId, rebuild]);

  const updateActivity = useCallback(async (dayId: string, activityId: string, updates: Partial<Activity>) => {
    const activity = await apiPut<any>(`/api/trips/${tripId}/itinerary/activities/${activityId}`, {
      title: updates.title,
      description: updates.description,
      location: updates.location,
      category: updates.category,
      start_time: updates.startTime,
      end_time: updates.endTime,
      cost: updates.cost,
      currency: updates.currency,
      status: updates.status,
      sort_order: updates.order,
    });
    rebuild(rawActivities.current.map(a => a.id === activityId ? activity : a));
    const socket = getSocket();
    socket?.emit("itinerary-change", { tripId, type: "updated", activity });
  }, [tripId, rebuild]);

  const deleteActivity = useCallback(async (dayId: string, activityId: string) => {
    await apiDelete(`/api/trips/${tripId}/itinerary/activities/${activityId}`);
    rebuild(rawActivities.current.filter(a => a.id !== activityId));
    const socket = getSocket();
    socket?.emit("itinerary-change", { tripId, type: "deleted", activity: { id: activityId } });
  }, [tripId, rebuild]);

  const updateDayTitle = useCallback(async (_dayId: string, _title: string) => {
    // Day titles are computed from dayNumber; not persisted separately
  }, []);

  return { days, loading, addActivity, updateActivity, deleteActivity, updateDayTitle };
}
