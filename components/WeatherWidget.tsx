"use client";
import { useEffect, useState } from "react";
import { Wind, Thermometer } from "lucide-react";

const WMO: Record<number, { icon: string; label: string; gradient: string }> = {
  0:  { icon: "☀️", label: "Clear",         gradient: "from-amber-500 to-orange-400" },
  1:  { icon: "🌤️", label: "Mostly clear",  gradient: "from-amber-400 to-blue-400" },
  2:  { icon: "⛅", label: "Partly cloudy", gradient: "from-blue-400 to-slate-400" },
  3:  { icon: "☁️", label: "Overcast",       gradient: "from-slate-500 to-slate-400" },
  45: { icon: "🌫️", label: "Foggy",          gradient: "from-slate-400 to-slate-300" },
  48: { icon: "🌫️", label: "Icy fog",        gradient: "from-slate-400 to-cyan-300" },
  51: { icon: "🌦️", label: "Light drizzle",  gradient: "from-blue-400 to-cyan-400" },
  61: { icon: "🌧️", label: "Light rain",     gradient: "from-blue-500 to-cyan-500" },
  63: { icon: "🌧️", label: "Rain",           gradient: "from-blue-600 to-cyan-600" },
  71: { icon: "❄️", label: "Light snow",     gradient: "from-cyan-300 to-blue-200" },
  80: { icon: "🌦️", label: "Rain showers",   gradient: "from-blue-500 to-purple-400" },
  95: { icon: "⛈️", label: "Thunderstorm",  gradient: "from-purple-600 to-slate-600" },
};

function getWeather(code: number) {
  const keys = Object.keys(WMO).map(Number).sort((a, b) => b - a);
  for (const k of keys) { if (code >= k) return WMO[k]; }
  return WMO[0];
}

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

interface Props { destination: string; }

export function WeatherWidget({ destination }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!destination) return;
    setLoading(true); setError(false);
    async function load() {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`, { headers: { "User-Agent": "TripLog/1.0" } });
        const geoData = await geoRes.json();
        if (!geoData[0]) { setError(true); return; }
        const { lat, lon } = geoData[0];
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=7&timezone=auto`;
        const wRes = await fetch(url);
        const wData = await wRes.json();
        setData({ ...wData, cityName: geoData[0].display_name.split(",")[0] });
      } catch { setError(true); }
      finally { setLoading(false); }
    }
    load();
  }, [destination]);

  if (loading) return (
    <div className="bg-white rounded-2xl p-5 animate-pulse h-40 border border-[#e2e8f0]">
      <div className="h-4 w-24 bg-[#e2e8f0] rounded mb-3" />
      <div className="h-10 w-20 bg-[#e2e8f0] rounded mb-2" />
      <div className="h-3 w-32 bg-[#e2e8f0] rounded" />
    </div>
  );

  if (error || !data) return null;

  const current = data.current;
  const daily = data.daily;
  const weather = getWeather(current.weathercode);

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#e2e8f0] shadow-sm">
      <div className={`bg-gradient-to-br ${weather.gradient} p-5`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/80 text-xs font-medium uppercase tracking-wider mb-1">🌍 {data.cityName} · Weather</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold text-white">{Math.round(current.temperature_2m)}°C</span>
              <span className="text-2xl mb-1">{weather.icon}</span>
            </div>
            <p className="text-white/80 text-sm mt-1">{weather.label}</p>
          </div>
          <div className="text-right space-y-1.5">
            <div className="flex items-center gap-1.5 text-white/70 text-xs justify-end">
              <Thermometer size={11} />
              <span>Feels {Math.round(current.apparent_temperature)}°</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/70 text-xs justify-end">
              <Wind size={11} />
              <span>{Math.round(current.windspeed_10m)} km/h</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {daily.time.slice(0, 7).map((date: string, i: number) => {
            const w = getWeather(daily.weathercode[i]);
            const dayName = i === 0 ? "Today" : DAYS[new Date(date).getDay()];
            return (
              <div key={date} className={`text-center py-2 px-1 rounded-xl ${i === 0 ? "bg-white/20" : ""}`}>
                <p className="text-white/70 text-[10px] mb-1">{dayName}</p>
                <p className="text-base leading-none mb-1">{w.icon}</p>
                <p className="text-white text-[10px] font-semibold">{Math.round(daily.temperature_2m_max[i])}°</p>
                <p className="text-white/60 text-[10px]">{Math.round(daily.temperature_2m_min[i])}°</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
