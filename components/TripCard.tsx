"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Calendar, Wallet, Image as ImageIcon } from "lucide-react";
import type { Trip } from "@/types";
import { formatShortDate, formatCurrency, tripDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { useStorage } from "@/contexts/StorageContext";

const statusVariant: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  planning: "info", active: "success", completed: "default", cancelled: "error",
};

export function TripCard({ trip }: { trip: Trip }) {
  const storage = useStorage();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [totalSpent, setTotalSpent] = useState(0);
  const [budget, setBudget] = useState<number | null>(null);

  useEffect(() => {
    storage.getBudget(trip.id).then(b => setBudget(b?.totalAmount ?? null));
    storage.getExpenses(trip.id).then(e => setTotalSpent(e.reduce((s, ex) => s + ex.amount, 0)));
    if (trip.coverImageId) {
      storage.getImageAsset(trip.coverImageId).then(async asset => {
        if (asset) {
          const blob = await storage.getImageBlob(asset.thumbnailBlobKey);
          if (blob) setCoverUrl(URL.createObjectURL(blob));
        }
      });
    }
    return () => { if (coverUrl) URL.revokeObjectURL(coverUrl); };
  }, [storage, trip]);

  return (
    <Link href={`/trips/${trip.id}`} className="group block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all">
      <div className="h-40 bg-gradient-to-br from-indigo-400 to-purple-500 relative">
        {coverUrl ? (
          <img src={coverUrl} alt={trip.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-white/50"><ImageIcon size={40} /></div>
        )}
        <div className="absolute top-3 right-3">
          <Badge variant={statusVariant[trip.status]}>{trip.status}</Badge>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{trip.title}</h3>
        <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
          <MapPin size={14} /><span className="truncate">{trip.destination}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
          <Calendar size={14} /><span>{formatShortDate(trip.startDate)} – {formatShortDate(trip.endDate)} · {tripDuration(trip)}d</span>
        </div>
        {budget !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="flex items-center gap-1"><Wallet size={12} /> Budget</span>
              <span>{formatCurrency(totalSpent)} / {formatCurrency(budget)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${totalSpent > budget ? "bg-red-400" : "bg-indigo-400"}`} style={{ width: `${Math.min(100, (totalSpent / budget) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
