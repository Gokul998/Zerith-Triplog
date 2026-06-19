"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, X, CheckCheck, MessageCircle, UserPlus, Calendar } from "lucide-react";
import { apiGet, apiPut } from "@/lib/api";
import { connectSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Notif {
  id: string;
  trip_id: string | null;
  title: string;
  body: string;
  read: number;
  created_at: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function notifIcon(title: string) {
  if (title.toLowerCase().includes("message") || title.toLowerCase().includes("chat")) return <MessageCircle size={14} className="text-indigo-500" />;
  if (title.toLowerCase().includes("invite") || title.toLowerCase().includes("join")) return <UserPlus size={14} className="text-green-500" />;
  return <Calendar size={14} className="text-purple-500" />;
}

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Notif | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    apiGet<Notif[]>("/api/notifications").then(setNotifs).catch(() => {});
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const s = connectSocket();
    const onNotif = (notif: Notif) => {
      setNotifs(prev => [notif, ...prev]);
      setToast(notif);
      setTimeout(() => setToast(n => n?.id === notif.id ? null : n), 4000);
    };
    s.on("notification", onNotif);
    return () => { s.off("notification", onNotif); };
  }, []);

  async function markAllRead() {
    await apiPut("/api/notifications/read-all", {});
    setNotifs(prev => prev.map(n => ({ ...n, read: 1 })));
  }

  async function markRead(id: string) {
    await apiPut(`/api/notifications/${id}/read`, {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
  }

  function handleClick(notif: Notif) {
    markRead(notif.id);
    setOpen(false);
    if (notif.trip_id) router.push(`/trips/${notif.trip_id}`);
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[60] bg-[#1e293b] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.4)] rounded-2xl px-4 py-3 flex items-start gap-3 max-w-xs">
          <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center shrink-0">
            <Bell size={14} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{toast.title}</p>
            <p className="text-xs text-white/50 truncate mt-0.5">{toast.body}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-white/30 hover:text-white shrink-0"><X size={14} /></button>
        </div>
      )}

      {/* Bell + dropdown */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setOpen(o => !o)}
          className="relative p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-[#1e293b] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] border border-white/10 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="font-semibold text-white text-sm">Notifications</h3>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="text-center py-10">
                  <Bell size={28} className="mx-auto mb-2 text-white/10" />
                  <p className="text-sm text-white/40">No notifications yet</p>
                </div>
              ) : (
                notifs.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0",
                      !n.read && "bg-indigo-500/5"
                    )}
                  >
                    <div className="w-7 h-7 bg-white/5 border border-white/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      {notifIcon(n.title)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", !n.read ? "font-semibold text-white" : "text-white/50")}>{n.title}</p>
                      <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-white/30 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 bg-indigo-400 rounded-full shrink-0 mt-2" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
