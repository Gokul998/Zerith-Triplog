"use client";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative bg-[#1e293b] rounded-3xl shadow-[0_8px_60px_rgba(0,0,0,0.5)] w-full max-w-lg max-h-[90vh] overflow-y-auto border border-white/10", className)}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
