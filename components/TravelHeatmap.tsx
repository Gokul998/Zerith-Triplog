"use client";
import { useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";
import { Globe, MapPin } from "lucide-react";

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: string;
}

declare global {
  interface Window { google: any; }
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  active: "#6366f1",
  planning: "#f97316",
  cancelled: "#ef4444",
};

export function TravelHeatmap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [pinCount, setPinCount] = useState(0);

  useEffect(() => {
    apiGet<Trip[]>("/api/trips").then(t => {
      setTrips(t);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function initMap() {
    if (!mapRef.current || !window.google) return;
    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 2,
      center: { lat: 20, lng: 10 },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#0f1629" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#0f1629" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#1e2d4a" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#080c18" }] },
        { featureType: "road", stylers: [{ visibility: "off" }] },
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
        { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0d1726" }] },
        { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#4a5568" }] },
      ],
    });
    googleMapRef.current = map;
    setMapReady(true);
  }

  // Load Google Maps
  useEffect(() => {
    if (loading || trips.length === 0) return;
    if (typeof window === "undefined") return;

    if (window.google?.maps) {
      initMap();
      return;
    }

    if (document.querySelector("script[data-maps-loaded]")) {
      // Script loading, wait for it
      const check = setInterval(() => {
        if (window.google?.maps) { clearInterval(check); initMap(); }
      }, 200);
      return () => clearInterval(check);
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.setAttribute("data-maps-loaded", "true");
    script.onload = () => initMap();
    document.head.appendChild(script);
  }, [loading, trips]);

  // Add markers once map is ready
  useEffect(() => {
    if (!mapReady || !googleMapRef.current || trips.length === 0) return;
    const map = googleMapRef.current;
    const geocoder = new window.google.maps.Geocoder();
    const bounds = new window.google.maps.LatLngBounds();
    let placed = 0;

    trips.forEach((trip) => {
      geocoder.geocode({ address: trip.destination }, (results: any, status: string) => {
        if (status !== "OK" || !results[0]) return;
        const pos = results[0].geometry.location;
        const color = STATUS_COLORS[trip.status] || "#6366f1";
        const startLabel = new Date(trip.start_date).toLocaleDateString("en", { month: "short", year: "numeric" });

        const marker = new window.google.maps.Marker({
          position: pos,
          map,
          title: trip.title,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: color,
            fillOpacity: 0.9,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          animation: window.google.maps.Animation.DROP,
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="background:#1a2035;color:#fff;padding:10px 14px;border-radius:10px;min-width:160px;font-family:sans-serif">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px">${trip.title}</div>
            <div style="color:#a0aec0;font-size:12px;margin-bottom:2px">📍 ${trip.destination}</div>
            <div style="color:#a0aec0;font-size:12px">📅 ${startLabel}</div>
            <div style="margin-top:6px;display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;background:${color}22;color:${color};border:1px solid ${color}44">${trip.status}</div>
          </div>`,
        });

        marker.addListener("click", () => infoWindow.open(map, marker));
        bounds.extend(pos);
        placed++;
        setPinCount(placed);
        if (placed > 0) map.fitBounds(bounds);
        if (placed === 1) map.setZoom(5);
      });
    });
  }, [mapReady, trips]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-36 glass rounded-xl animate-pulse" />
        <div className="h-80 glass rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (trips.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe size={18} className="text-indigo-400" />
        <h2 className="text-xl font-bold text-white">My Travel Map</h2>
      </div>

      <div className="glass rounded-2xl overflow-hidden border border-white/5">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-indigo-400" />
            <span className="text-white/70 text-sm font-medium">{pinCount} destination{pinCount !== 1 ? "s" : ""} mapped</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/40">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {status}
              </span>
            ))}
          </div>
        </div>

        <div ref={mapRef} className="h-80 w-full" />

        {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
          <div className="px-4 py-3 text-center text-sm text-amber-400/80">
            Add NEXT_PUBLIC_GOOGLE_MAPS_KEY to your .env.local to enable the map
          </div>
        )}
      </div>
    </section>
  );
}
