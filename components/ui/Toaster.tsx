"use client";
import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let _id = 0;

export function toast(message: string, type: ToastType = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { message, type, id: ++_id } }));
}

const icons = {
  success: <CheckCircle size={16} className="shrink-0 text-emerald-400" />,
  error: <AlertCircle size={16} className="shrink-0 text-red-400" />,
  info: <Info size={16} className="shrink-0 text-indigo-400" />,
};

const bars = {
  success: "bg-emerald-400",
  error: "bg-red-400",
  info: "bg-indigo-400",
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const t = (e as CustomEvent).detail as Toast;
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4000);
    };
    window.addEventListener("app-toast", handler);
    return () => window.removeEventListener("app-toast", handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-md border border-white/10 bg-white/10 min-w-[260px] max-w-sm animate-in slide-in-from-right-4 fade-in duration-300"
        >
          {icons[t.type]}
          <p className="text-sm text-white/90 flex-1 leading-snug">{t.message}</p>
          <button
            className="text-white/30 hover:text-white/70 transition-colors"
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          >
            <X size={14} />
          </button>
          <div className={`absolute bottom-0 left-0 h-0.5 rounded-full ${bars[t.type]} animate-shrink`} />
        </div>
      ))}
    </div>
  );
}
