"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Camera, Wallet, Map, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Itinerary", href: "/itinerary", icon: CalendarDays },
  { label: "Timeline", href: "/timeline", icon: Clock },
  { label: "Memories", href: "/memories", icon: Camera },
  { label: "Budget", href: "/budget", icon: Wallet },
  { label: "Map", href: "/map", icon: Map },
];

export function TripNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;

  return (
    <nav className="flex gap-1 mb-6 overflow-x-auto scrollbar-hide p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
      {tabs.map(({ label, href, icon: Icon }) => {
        const fullHref = `${base}${href}`;
        const active = href === "" ? pathname === base : pathname.startsWith(fullHref);
        return (
          <Link
            key={href}
            href={fullHref}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-semibold whitespace-nowrap rounded-xl transition-all duration-200",
              active
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
                : "text-white/50 hover:text-white hover:bg-white/5"
            )}
          >
            <Icon size={14} />{label}
          </Link>
        );
      })}
    </nav>
  );
}
