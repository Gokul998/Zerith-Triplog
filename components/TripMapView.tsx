"use client";
import { useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  sightseeing: "#6366f1", food: "#f97316", transport: "#3b82f6",
  accommodation: "#8b5cf6", activity: "#10b981", shopping: "#ec4899", other: "#6b7280",
};

interface Pin { title: string; location: string; category: string; lat: number; lon: number; }

export function TripMapView({ tripId, destination }: { tripId: string; destination: string }) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    // Geocode activities and destination
    async function loadPins() {
      try {
        // Get all activities from itinerary (localStorage)
        const lsKeys = Object.keys(localStorage).filter(k => k.startsWith(`tp:days:${tripId}`));
        const allActivities: any[] = [];
        for (const key of lsKeys) {
          const days = JSON.parse(localStorage.getItem(key) || "[]");
          for (const day of days) allActivities.push(...(day.activities || []));
        }
        // Also fetch from API if available
        const newPins: Pin[] = [];
        const toGeocode = [...new Set(allActivities.filter(a => a.location).map(a => a.location))];
        // Always add destination
        if (!toGeocode.includes(destination)) toGeocode.unshift(destination);

        for (const loc of toGeocode.slice(0, 15)) {
          try {
            const r = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"}/api/geocode?q=${encodeURIComponent(loc)}`);
            const geo = await r.json();
            if (geo[0]) {
              const matching = allActivities.filter(a => a.location === loc);
              if (matching.length) {
                for (const act of matching) {
                  newPins.push({ title: act.title, location: loc, category: act.category || "other", lat: parseFloat(geo[0].lat), lon: parseFloat(geo[0].lon) });
                }
              } else {
                newPins.push({ title: loc, location: loc, category: "sightseeing", lat: parseFloat(geo[0].lat), lon: parseFloat(geo[0].lon) });
              }
            }
          } catch {}
        }
        setPins(newPins);
        setStatus("ready");
      } catch { setStatus("error"); }
    }
    loadPins();
  }, [tripId, destination]);

  useEffect(() => {
    if (status !== "ready" || !containerRef.current) return;
    // Dynamically import Leaflet to avoid SSR issues
    import("leaflet").then(L => {
      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png", iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png", shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png" });

      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      if (!containerRef.current) return;

      const center = pins.length ? [pins[0].lat, pins[0].lon] : [35.6762, 139.6503];
      const map = L.map(containerRef.current).setView(center as [number, number], pins.length > 1 ? 11 : 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);

      const bounds: [number, number][] = [];
      for (const pin of pins) {
        const color = CATEGORY_COLORS[pin.category] || "#6b7280";
        const icon = L.divIcon({
          html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
          className: "", iconSize: [12, 12], iconAnchor: [6, 6],
        });
        L.marker([pin.lat, pin.lon], { icon }).addTo(map)
          .bindPopup(`<strong>${pin.title}</strong><br><span style="color:#6b7280;font-size:12px">${pin.location}</span>`);
        bounds.push([pin.lat, pin.lon]);
      }
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
      mapRef.current = map;
    });

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [status, pins]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Trip Map</h3>
        {pins.length > 0 && (
          <div className="flex gap-3 text-xs text-gray-400 flex-wrap">
            {Object.entries(CATEGORY_COLORS).filter(([cat]) => pins.some(p => p.category === cat)).map(([cat, color]) => (
              <span key={cat} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />{cat}
              </span>
            ))}
          </div>
        )}
      </div>

      {status === "loading" && (
        <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
          <div className="text-center"><div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />Geocoding locations...</div>
        </div>
      )}
      {status === "error" && <div className="h-72 flex items-center justify-center text-gray-400">Could not load map</div>}
      {status === "ready" && (
        <>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <div ref={containerRef} className="h-72 w-full z-0" />
          {pins.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="bg-white/80 rounded-lg px-3 py-1.5 text-sm text-gray-500">Add activities with locations to see them on the map</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
