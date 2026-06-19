"use client";
import { useEffect, useRef, useState } from "react";
import type { Activity, ActivityCategory } from "@/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type FormData = Omit<Activity, "id" | "dayId" | "tripId" | "order">;

const categories: ActivityCategory[] = ["transport", "accommodation", "food", "sightseeing", "activity", "shopping", "other"];

interface Props { initial?: Partial<Activity>; onSave: (data: FormData) => void; onCancel: () => void; }

declare global {
  interface Window { google: any; }
}

export function ActivityForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormData>({
    title: initial?.title ?? "", description: initial?.description ?? "", startTime: initial?.startTime ?? null, endTime: initial?.endTime ?? null,
    location: initial?.location ?? "", category: initial?.category ?? "sightseeing", cost: initial?.cost ?? 0, currency: initial?.currency ?? "USD", status: initial?.status ?? "planned",
  });
  const set = (k: string, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));
  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    function setupAutocomplete() {
      if (!locationInputRef.current || !window.google?.maps?.places) return;
      if (autocompleteRef.current) return;
      const ac = new window.google.maps.places.Autocomplete(locationInputRef.current, { types: ["establishment", "geocode"] });
      autocompleteRef.current = ac;
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const name = place.name || place.formatted_address || locationInputRef.current?.value || "";
        set("location", name);
      });
    }

    if (window.google?.maps?.places) {
      setupAutocomplete();
    } else {
      const interval = setInterval(() => {
        if (window.google?.maps?.places) {
          setupAutocomplete();
          clearInterval(interval);
        }
      }, 500);

      if (!document.querySelector('script[data-maps-loaded]')) {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places`;
        script.async = true;
        script.setAttribute("data-maps-loaded", "true");
        script.onload = () => { setupAutocomplete(); clearInterval(interval); };
        document.head.appendChild(script);
      }

      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="space-y-3">
      <Input label="Activity" id="act-title" placeholder="Visit Senso-ji Temple" value={form.title} onChange={e => set("title", e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-white/60">Category</label>
          <select className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" value={form.category} onChange={e => set("category", e.target.value)}>
            {categories.map(c => <option key={c} value={c} className="bg-[#1e293b]">{c}</option>)}
          </select>
        </div>
        <Input label="Cost" id="act-cost" type="number" value={form.cost} onChange={e => set("cost", parseFloat(e.target.value) || 0)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Start time" id="act-start" type="time" value={form.startTime ?? ""} onChange={e => set("startTime", e.target.value || null)} />
        <Input label="End time" id="act-end" type="time" value={form.endTime ?? ""} onChange={e => set("endTime", e.target.value || null)} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-white/60">Location</label>
        <input
          ref={locationInputRef}
          id="act-loc"
          placeholder="Asakusa, Tokyo"
          value={form.location}
          onChange={e => set("location", e.target.value)}
          className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="button" size="sm" onClick={() => form.title && onSave(form)}>Save</Button>
      </div>
    </div>
  );
}
