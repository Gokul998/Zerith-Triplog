"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { useItinerary } from "@/hooks/useItinerary";

const CATEGORY_COLORS: Record<string, string> = {
  sightseeing: "#6366f1",
  food: "#f97316",
  transport: "#3b82f6",
  accommodation: "#8b5cf6",
  activity: "#10b981",
  shopping: "#ec4899",
  other: "#6b7280",
};

declare global {
  interface Window { google: any; }
}

export default function MapPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    apiGet<any>(`/api/trips/${tripId}`).then(setTrip).catch(() => {});
  }, [tripId]);

  const { days, loading } = useItinerary(trip || { id: tripId, startDate: "2024-01-01", endDate: "2024-01-01" });
  const activities = days.flatMap(d => d.activities);

  function initMap() {
    if (!mapRef.current || !window.google) return;
    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: 35.6762, lng: 139.6503 },
      mapTypeControl: false,
      streetViewControl: false,
    });
    googleMapRef.current = map;
    setMapReady(true);

    if (trip?.destination) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: trip.destination }, (results: any, status: string) => {
        if (status === "OK" && results[0]) {
          map.setCenter(results[0].geometry.location);
        }
      });
    }
  }

  useEffect(() => {
    if (!trip) return;
    if (typeof window === "undefined") return;

    if (window.google?.maps) {
      initMap();
      return;
    }

    if (document.querySelector('script[data-maps-loaded]')) return;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.setAttribute("data-maps-loaded", "true");
    script.onload = () => initMap();
    document.head.appendChild(script);
  }, [trip]);

  useEffect(() => {
    if (!mapReady || !googleMapRef.current || loading) return;
    const map = googleMapRef.current;
    const geocoder = new window.google.maps.Geocoder();
    const bounds = new window.google.maps.LatLngBounds();
    let hasMarkers = false;

    for (const activity of activities) {
      const locationStr = activity.location || (trip?.destination ?? "");
      if (!locationStr) continue;

      geocoder.geocode({ address: locationStr }, (results: any, status: string) => {
        if (status !== "OK" || !results[0]) return;
        const pos = results[0].geometry.location;
        const color = CATEGORY_COLORS[activity.category] || "#6b7280";

        const marker = new window.google.maps.Marker({
          position: pos,
          map,
          title: activity.title,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="max-width:200px"><strong>${activity.title}</strong><br/><span style="color:#6b7280;font-size:12px">${activity.location || ""}</span>${activity.description ? `<br/><span style="font-size:12px;margin-top:4px;display:block">${activity.description}</span>` : ""}</div>`,
        });

        marker.addListener("click", () => infoWindow.open(map, marker));
        bounds.extend(pos);
        hasMarkers = true;
        if (hasMarkers) map.fitBounds(bounds);
      });
    }
  }, [mapReady, activities, loading]);

  if (!trip) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-14 bg-white/5 rounded-2xl border border-white/10" />
        <div className="h-72 bg-white/5 rounded-2xl border border-white/10" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1e293b] rounded-2xl p-4 flex items-center justify-between border border-white/10">
        <div>
          <h2 className="text-lg font-bold text-white">Trip Map</h2>
          <p className="text-white/40 text-sm">{activities.length} location{activities.length !== 1 ? "s" : ""} pinned</p>
        </div>
        <span className="text-2xl">🗺️</span>
      </div>

      <div className="bg-[#1e293b] rounded-2xl overflow-hidden border border-white/10">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-white">Google Maps</h3>
          <div className="flex gap-3 text-xs text-white/40 flex-wrap">
            {Object.entries(CATEGORY_COLORS).filter(([cat]) => activities.some(a => a.category === cat)).map(([cat, color]) => (
              <span key={cat} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />{cat}
              </span>
            ))}
          </div>
        </div>
        <div ref={mapRef} className="h-[500px] w-full" />
        {activities.length === 0 && (
          <div className="px-4 py-3 text-center text-sm text-white/40">
            Add activities with locations in the Itinerary tab to see them pinned on the map
          </div>
        )}
      </div>
    </div>
  );
}
