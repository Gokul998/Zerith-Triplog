"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Trip {
  destination: string;
  start_date?: string;
  end_date?: string;
  [key: string]: any;
}

interface Props {
  trip: Trip;
}

function formatSkyscannerDate(dateStr?: string): string {
  if (!dateStr) return "";
  // Format: YYMMDD
  const d = new Date(dateStr);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

function formatKayakDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function FlightSearch({ trip }: Props) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [depDate, setDepDate] = useState(trip.start_date?.slice(0, 10) ?? "");
  const [retDate, setRetDate] = useState(trip.end_date?.slice(0, 10) ?? "");
  const [passengers, setPassengers] = useState(1);

  const dest = trip.destination;
  const destSlug = dest.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  function skyscannerUrl() {
    const from = origin.trim() || "anywhere";
    const out = formatSkyscannerDate(depDate);
    const ret = formatSkyscannerDate(retDate);
    if (out && ret) {
      return `https://www.skyscanner.com/transport/flights/${encodeURIComponent(from)}/${destSlug}/${out}/${ret}/?adults=${passengers}`;
    }
    return `https://www.skyscanner.com/transport/flights/${encodeURIComponent(from)}/${destSlug}/`;
  }

  function googleFlightsUrl() {
    const from = origin.trim() || "";
    const q = from
      ? `flights from ${from} to ${dest}`
      : `flights to ${dest}`;
    let url = `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
    return url;
  }

  function kayakUrl() {
    const from = origin.trim() || "anywhere";
    const out = formatKayakDate(depDate);
    const ret = formatKayakDate(retDate);
    if (out && ret) {
      return `https://www.kayak.com/flights/${encodeURIComponent(from)}-${destSlug}/${out}/${ret}/${passengers}adults`;
    }
    return `https://www.kayak.com/flights/${encodeURIComponent(from)}-${destSlug}`;
  }

  function hotelUrl(provider: "booking" | "hotels") {
    if (provider === "booking") {
      return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(dest)}&checkin=${depDate}&checkout=${retDate}&group_adults=${passengers}`;
    }
    return `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(dest)}&q-check-in=${depDate}&q-check-out=${retDate}`;
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#e2e8f0]">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f8faff] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">✈️</span>
          <span className="font-semibold text-[#1e2044] text-sm">Search Flights & Hotels</span>
        </div>
        {open ? <ChevronUp size={16} className="text-[#94a3b8]" /> : <ChevronDown size={16} className="text-[#94a3b8]" />}
      </button>

      {open && (
        <div className="border-t border-[#e2e8f0] p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#64748b]">From (city/airport)</label>
              <input
                className="rounded-xl bg-white border border-[#e2e8f0] px-3 py-2 text-sm text-[#1e2044] placeholder-[#94a3b8] focus:border-indigo-400 focus:outline-none"
                placeholder="e.g. New York, JFK"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#64748b]">To (destination)</label>
              <div className="rounded-xl bg-[#f0f4ff] border border-[#e2e8f0] px-3 py-2 text-sm text-[#64748b] truncate">
                {dest}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#64748b]">Departure</label>
              <input type="date" className="rounded-xl bg-white border border-[#e2e8f0] px-3 py-2 text-sm text-[#1e2044] focus:border-indigo-400 focus:outline-none" value={depDate} onChange={e => setDepDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#64748b]">Return</label>
              <input type="date" className="rounded-xl bg-white border border-[#e2e8f0] px-3 py-2 text-sm text-[#1e2044] focus:border-indigo-400 focus:outline-none" value={retDate} onChange={e => setRetDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#64748b]">Passengers</label>
              <input type="number" min={1} max={9} className="rounded-xl bg-white border border-[#e2e8f0] px-3 py-2 text-sm text-[#1e2044] focus:border-indigo-400 focus:outline-none" value={passengers} onChange={e => setPassengers(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
          </div>

          {/* Flight search links */}
          <div>
            <p className="text-[#94a3b8] text-xs uppercase tracking-wider mb-2">Flights</p>
            <div className="grid grid-cols-1 gap-2">
              <a href={skyscannerUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl bg-cyan-50 border border-cyan-200 px-4 py-3 hover:bg-cyan-100 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🌐</span>
                  <div>
                    <p className="text-[#1e2044] text-sm font-medium">Skyscanner</p>
                    <p className="text-[#94a3b8] text-xs">Best price comparison</p>
                  </div>
                </div>
                <ExternalLink size={14} className="text-[#94a3b8] group-hover:text-cyan-600 transition-colors" />
              </a>
              <a href={googleFlightsUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 hover:bg-blue-100 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔍</span>
                  <div>
                    <p className="text-[#1e2044] text-sm font-medium">Google Flights</p>
                    <p className="text-[#94a3b8] text-xs">Price calendar & alerts</p>
                  </div>
                </div>
                <ExternalLink size={14} className="text-[#94a3b8] group-hover:text-blue-600 transition-colors" />
              </a>
              <a href={kayakUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 hover:bg-orange-100 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🛶</span>
                  <div>
                    <p className="text-[#1e2044] text-sm font-medium">Kayak</p>
                    <p className="text-[#94a3b8] text-xs">Flexible date search</p>
                  </div>
                </div>
                <ExternalLink size={14} className="text-[#94a3b8] group-hover:text-orange-600 transition-colors" />
              </a>
            </div>
          </div>

          {/* Hotel search links */}
          <div>
            <p className="text-[#94a3b8] text-xs uppercase tracking-wider mb-2">Hotels in {dest}</p>
            <div className="grid grid-cols-2 gap-2">
              <a href={hotelUrl("booking")} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-3 hover:bg-indigo-100 transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏨</span>
                  <div>
                    <p className="text-[#1e2044] text-xs font-medium">Booking.com</p>
                    <p className="text-[#94a3b8] text-xs">Free cancellation</p>
                  </div>
                </div>
                <ExternalLink size={12} className="text-[#94a3b8] group-hover:text-indigo-600" />
              </a>
              <a href={hotelUrl("hotels")} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl bg-purple-50 border border-purple-200 px-3 py-3 hover:bg-purple-100 transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛎️</span>
                  <div>
                    <p className="text-[#1e2044] text-xs font-medium">Hotels.com</p>
                    <p className="text-[#94a3b8] text-xs">Rewards program</p>
                  </div>
                </div>
                <ExternalLink size={12} className="text-[#94a3b8] group-hover:text-purple-600" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
