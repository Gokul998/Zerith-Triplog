"use client";
import { useEffect, useRef, useState } from "react";
import { Send, MessageCircle, X, Bot, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPost } from "@/lib/api";
import { connectSocket, getSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";

interface Message { id: string; user_id: string; user_name: string; avatar_color: string; content: string; created_at: string; type?: string; }

export function TripChat({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    apiGet<Message[]>(`/api/trips/${tripId}/messages`).then(setMessages);
    setUnread(0);
  }, [open, tripId]);

  useEffect(() => {
    const s = connectSocket();
    s.emit("join-trip", tripId);
    s.on("new-message", (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      if (!open) setUnread(u => u + 1);
    });
    s.on("user-typing", ({ userName, isTyping }: { userName: string; isTyping: boolean }) => {
      setTyping(isTyping ? userName : null);
    });
    return () => { s.off("new-message"); s.off("user-typing"); s.emit("leave-trip", tripId); };
  }, [tripId, open]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function send() {
    if (!input.trim()) return;
    if (aiMode) {
      sendAiMessage();
    } else {
      getSocket().emit("send-message", { tripId, content: input.trim() });
      setInput("");
    }
  }

  async function sendAiMessage() {
    const question = input.trim();
    if (!question) return;
    setInput("");
    setAiLoading(true);

    const userMsg: Message = {
      id: `local-${Date.now()}`,
      user_id: user?.id || "",
      user_name: user?.name || "You",
      avatar_color: user?.avatar_color || "#6366f1",
      content: question,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const { reply } = await apiPost<{ reply: string }>(`/api/trips/${tripId}/ai-chat`, { message: question });
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        user_id: "ai",
        user_name: "TripLog AI",
        avatar_color: "#8b5cf6",
        content: reply,
        created_at: new Date().toISOString(),
        type: "ai",
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = {
        id: `ai-err-${Date.now()}`,
        user_id: "ai",
        user_name: "TripLog AI",
        avatar_color: "#8b5cf6",
        content: "Sorry, I couldn't process your request. Please try again.",
        created_at: new Date().toISOString(),
        type: "ai",
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setAiLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); return; }
    if (!aiMode) {
      getSocket().emit("typing", { tripId, isTyping: true });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => getSocket().emit("typing", { tripId, isTyping: false }), 1500);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <>
      <button onClick={() => { setOpen(o => !o); setUnread(0); }} className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] hover:scale-110 transition-all flex items-center justify-center">
        {open ? <X size={22} /> : <><MessageCircle size={22} />{unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unread}</span>}</>}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-80 h-[500px] bg-[#0f172a]/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] border border-white/10 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} className="text-indigo-400" />
              <span className="font-semibold text-sm text-white">Trip Chat</span>
            </div>
            <button
              onClick={() => setAiMode(m => !m)}
              className={cn("flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all", aiMode ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-white/5 hover:bg-white/10 text-white/50 border border-white/10")}
              title={aiMode ? "Switch to group chat" : "Ask AI assistant"}
            >
              <Bot size={13} />
              {aiMode ? "AI Mode" : "Ask AI"}
            </button>
          </div>

          {aiMode && (
            <div className="bg-purple-500/10 border-b border-purple-500/20 px-3 py-2 text-xs text-purple-300 flex items-center gap-1.5">
              <Bot size={12} />
              Ask TripLog AI anything about your trip
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && <p className="text-center text-white/30 text-sm mt-8">No messages yet. Say hello!</p>}
            {messages.map(msg => {
              const isMe = msg.user_id === user?.id;
              const isAI = msg.user_id === "ai" || msg.type === "ai";
              return (
                <div key={msg.id} className={cn("flex gap-2", isMe && !isAI && "flex-row-reverse")}>
                  <div
                    className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0", isAI && "bg-purple-500")}
                    style={!isAI ? { backgroundColor: msg.avatar_color } : undefined}
                  >
                    {isAI ? <Bot size={14} /> : msg.user_name[0]}
                  </div>
                  <div className={cn("max-w-[80%]", isMe && !isAI && "items-end flex flex-col")}>
                    {(!isMe || isAI) && <p className="text-xs text-white/30 mb-0.5">{msg.user_name}</p>}
                    <div className={cn("px-3 py-2 rounded-2xl text-sm", isAI ? "bg-purple-500/15 text-purple-200 border border-purple-500/20 rounded-tl-sm" : isMe ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-tr-sm" : "bg-white/5 text-white/80 border border-white/10 rounded-tl-sm")}>
                      {msg.content}
                    </div>
                    <p className="text-xs text-white/30 mt-0.5">{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              );
            })}
            {typing && !aiMode && <p className="text-xs text-white/30 italic">{typing} is typing...</p>}
            {aiLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white shrink-0"><Bot size={14} /></div>
                <div className="bg-purple-500/15 border border-purple-500/20 px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-purple-400" />
                  <span className="text-sm text-purple-300">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-white/10 p-2 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={aiMode ? "Ask AI anything..." : "Message..."}
              className="flex-1 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500"
            />
            <button onClick={send} disabled={!input.trim() || aiLoading} className={cn("disabled:opacity-40 text-white rounded-full p-2 transition-colors", aiMode ? "bg-purple-500 hover:bg-purple-400" : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500")}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
