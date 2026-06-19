"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Plane } from "lucide-react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { TripNav } from "@/components/TripNav";
import { TripChat } from "@/components/TripChat";
import { NotificationBell } from "@/components/NotificationBell";

export default function TripLayout({ children }: { children: React.ReactNode }) {
  const { tripId } = useParams<{ tripId: string }>();
  const [title, setTitle] = useState<string | null>(null);
  const [dates, setDates] = useState<string | null>(null);

  useEffect(() => {
    apiGet<any>(`/api/trips/${tripId}`).then(t => {
      setTitle(t.title);
      const fmt = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
      setDates(`${fmt(t.start_date)} – ${fmt(t.end_date)}`);
    }).catch(() => {});
  }, [tripId]);

  return (
    <div className="min-h-screen mesh-bg">
      <header className="bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"><ArrowLeft size={18} /></Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-1.5 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)] shrink-0"><Plane size={14} /></div>
            <div className="min-w-0">
              <p className="font-bold text-white truncate leading-tight">{title ?? "Loading..."}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {dates && <span className="text-xs text-white/40 hidden sm:block">{dates}</span>}
            <NotificationBell />
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-2">
          <TripNav tripId={tripId} />
        </div>
      </header>
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
      <TripChat tripId={tripId} />
    </div>
  );
}
