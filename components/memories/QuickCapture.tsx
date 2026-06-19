"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, X, Zap, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  onCapture: (data: { title: string; date: string; note: string; location: string }, files: File[]) => Promise<void>;
}

export function QuickCapture({ onCapture }: Props) {
  const [open, setOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function startCamera() {
    setCameraError(false);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch {
      setCameraError(true);
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  }

  function takePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      setCaptured(file);
      setPreview(URL.createObjectURL(blob));
      stopCamera();
    }, "image/jpeg", 0.9);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCaptured(file);
    setPreview(URL.createObjectURL(file));
  }

  function tryGetLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`, { headers: { "User-Agent": "TripLog/1.0" } });
        const d = await r.json();
        setLocation(d.address?.city || d.address?.town || d.address?.county || "");
      } catch {}
    });
  }

  async function save() {
    if (!captured) return;
    setSaving(true);
    const now = new Date();
    const title = `Memory — ${now.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}`;
    const date = now.toISOString().split("T")[0];
    try {
      await onCapture({ title, date, note, location }, [captured]);
      close();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  function close() {
    stopCamera();
    setCaptured(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setNote(""); setLocation("");
    setCameraError(false);
    setOpen(false);
  }

  useEffect(() => {
    if (open && !cameraError && !captured) startCamera();
  }, [open]);

  useEffect(() => {
    if (open) tryGetLocation();
  }, [open]);

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:shadow-[0_0_40px_rgba(99,102,241,0.7)] hover:scale-110 transition-all"
      >
        <Zap size={22} className="text-white" />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-indigo-400" />
              <span className="font-bold text-white">Quick Capture</span>
            </div>
            <button onClick={close} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white"><X size={18} /></button>
          </div>

          {/* Camera / Preview */}
          <div className="flex-1 relative overflow-hidden">
            {!captured ? (
              <>
                {cameraError ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4">
                    <Camera size={48} className="text-white/20" />
                    <p className="text-white/40 text-sm">Camera not available</p>
                    <button onClick={() => fileRef.current?.click()} className="glass border border-white/10 text-white/60 hover:text-white px-4 py-2 rounded-xl text-sm">
                      Choose from Gallery
                    </button>
                  </div>
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </>
            ) : (
              <div className="h-full flex flex-col">
                <img src={preview!} alt="captured" className="flex-1 object-contain" />
                <div className="p-4 space-y-3 border-t border-white/10">
                  <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
                    <MapPin size={14} className="text-indigo-400 shrink-0" />
                    <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (auto-detected)" className="bg-transparent text-white text-sm flex-1 outline-none placeholder-white/20" />
                  </div>
                  <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note... (optional)" className="w-full glass rounded-xl px-3 py-2 text-white text-sm outline-none placeholder-white/20 resize-none" rows={2} />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-white/10">
            {!captured ? (
              <div className="flex gap-3">
                <button onClick={() => fileRef.current?.click()} className="flex-1 glass border border-white/10 text-white/60 py-3 rounded-2xl text-sm font-medium">
                  Gallery
                </button>
                {!cameraError && (
                  <button onClick={takePhoto} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-2xl text-sm font-bold shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                    📸 Capture
                  </button>
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => { setCaptured(null); setPreview(null); if (!cameraError) startCamera(); }} className="flex-1 glass border border-white/10 text-white/60 py-3 rounded-2xl text-sm font-medium">
                  Retake
                </button>
                <Button onClick={save} disabled={saving} className="flex-1 py-3 rounded-2xl justify-center">
                  {saving ? <><Loader2 size={16} className="animate-spin" />Saving...</> : "✨ Save Memory"}
                </Button>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>
      )}
    </>
  );
}
