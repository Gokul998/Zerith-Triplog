"use client";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Activity {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime?: string | null;
  endTime?: string | null;
  // snake_case fallbacks for public share page use
  start_time?: string | null;
  end_time?: string | null;
}

interface ItineraryDay {
  id: string;
  date: string;
  activities: Activity[];
}

interface Props {
  trip: { title: string; destination: string };
  days: ItineraryDay[];
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIcsDateTime(dateStr: string, timeStr?: string | null): string {
  // dateStr = YYYY-MM-DD, timeStr = HH:MM
  const d = new Date(dateStr + "T" + (timeStr || "00:00") + ":00");
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    "T",
    pad(d.getHours()),
    pad(d.getMinutes()),
    "00",
  ].join("");
}

function toDateOnly(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function CalendarExport({ trip, days }: Props) {
  function generateIcs() {
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TripLog//TripLog//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeIcs(trip.title)}`,
      `X-WR-TIMEZONE:UTC`,
    ];

    const now = toIcsDateTime(new Date().toISOString().split("T")[0], new Date().toTimeString().slice(0, 5));

    for (const day of days) {
      const date = day.date || (day as any).id;
      for (const act of day.activities) {
        const uid = `triplog-${act.id}@triplog.app`;
        const startTime = act.startTime ?? act.start_time;
        const endTime = act.endTime ?? act.end_time;
        const hasTime = !!startTime;
        const dtstart = hasTime
          ? `DTSTART:${toIcsDateTime(date, startTime)}`
          : `DTSTART;VALUE=DATE:${toDateOnly(date)}`;
        const dtend = hasTime
          ? `DTEND:${toIcsDateTime(date, endTime || startTime)}`
          : `DTEND;VALUE=DATE:${toDateOnly(date)}`;

        const descParts = [act.description, act.location ? `Location: ${act.location}` : ""].filter(Boolean).join("\\n");

        lines.push(
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTAMP:${now}Z`,
          dtstart,
          dtend,
          `SUMMARY:${escapeIcs(act.title)}`,
          ...(descParts ? [`DESCRIPTION:${escapeIcs(descParts)}`] : []),
          ...(act.location ? [`LOCATION:${escapeIcs(act.location)}`] : []),
          "END:VEVENT",
        );
      }
    }

    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  function handleExport() {
    const ics = generateIcs();
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trip.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const totalActivities = days.reduce((sum, d) => sum + d.activities.length, 0);
  if (totalActivities === 0) return null;

  return (
    <Button variant="secondary" size="sm" onClick={handleExport}>
      <CalendarDays size={13} /> Export to Calendar
    </Button>
  );
}
