"use client";
import { useEffect, useState } from "react";
import { HardDrive, FolderOpen, Upload, ExternalLink, CheckCircle, AlertCircle, Loader2, Download, Smartphone } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/Button";
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface DriveStatus {
  connected: boolean;
  folderId: string | null;
  folderUrl: string | null;
}

interface Props {
  tripId: string;
  memories: { id: string; title: string; images: any[] }[];
}

export function DrivePanel({ tripId, memories }: Props) {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedIds, setUploadedIds] = useState<Set<string>>(new Set());
  const [notConfigured, setNotConfigured] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    apiGet<DriveStatus>(`/api/trips/${tripId}/drive`)
      .then(setStatus)
      .catch(() => setStatus({ connected: false, folderId: null, folderUrl: null }))
      .finally(() => setLoading(false));
    const params = new URLSearchParams(window.location.search);
    if (params.get("drive") === "connected") {
      setStatus(s => s ? { ...s, connected: true } : null);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [tripId]);

  async function connectDrive() {
    try {
      const token = localStorage.getItem("tl_token");
      const res = await fetch(`${BACKEND}/api/trips/${tripId}/drive/auth-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error === "not_configured") { setNotConfigured(true); return; }
      if (data.url) { window.location.href = data.url; return; }
      alert("Unexpected response: " + JSON.stringify(data));
    } catch (e: any) {
      alert("Failed to connect Google Drive: " + (e?.message || "Unknown error"));
    }
  }

  async function createFolder() {
    setCreating(true);
    try {
      const result = await apiPost<any>(`/api/trips/${tripId}/drive/create-folder`, {});
      setStatus(s => s ? { ...s, folderId: result.folderId, folderUrl: result.folderUrl } : null);
    } catch (e: any) { alert(e.message); }
    finally { setCreating(false); }
  }

  async function downloadToDevice() {
    setDownloading(true);
    try {
      const token = localStorage.getItem("tl_token");
      const res = await fetch(`${BACKEND}/api/trips/${tripId}/memories/download-zip`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trip_memories.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { alert(e.message); }
    finally { setDownloading(false); }
  }

  async function uploadMemory(memoryId: string) {
    setUploading(memoryId);
    try {
      await apiPost(`/api/trips/${tripId}/drive/upload/${memoryId}`, {});
      setUploadedIds(prev => new Set([...prev, memoryId]));
    } catch (e: any) { alert(e.message); }
    finally { setUploading(null); }
  }

  if (loading) return null;

  const memoriesWithImages = memories.filter(m => m.images?.length > 0);

  return (
    <div className="bg-[#1e293b] rounded-2xl p-4 border border-white/10 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center">
          <HardDrive size={16} className="text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">Google Drive Backup</h3>
          <p className="text-xs text-white/40">Sync memories to a shared Drive folder</p>
        </div>
        {status?.connected && <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1"><CheckCircle size={10} /> Connected</span>}
      </div>

      {notConfigured && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold flex items-center gap-1"><AlertCircle size={12} /> Google OAuth not configured yet</p>
            <button onClick={() => setNotConfigured(false)} className="text-amber-400 hover:text-amber-300 text-[11px] underline">Dismiss</button>
          </div>
          <p className="text-amber-400/70">Add these to your <code className="bg-amber-500/10 px-1 rounded">.env.local</code> file:</p>
          <pre className="bg-amber-500/10 border border-amber-500/20 rounded p-2 text-[11px] overflow-x-auto text-amber-300">{`GOOGLE_CLIENT_ID=your-client-id\nGOOGLE_CLIENT_SECRET=your-client-secret`}</pre>
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" className="text-blue-400 underline flex items-center gap-1">Open Google Cloud Console <ExternalLink size={10} /></a>
        </div>
      )}

      {!status?.connected && !notConfigured && (
        <Button variant="secondary" size="sm" className="w-full justify-center" onClick={connectDrive}>
          <HardDrive size={14} />Connect Google Drive
        </Button>
      )}

      {status?.connected && !status?.folderId && (
        <Button size="sm" className="w-full justify-center" onClick={createFolder} disabled={creating}>
          {creating ? <Loader2 size={14} className="animate-spin" /> : <FolderOpen size={14} />}
          {creating ? "Creating folder…" : "Create Trip Folder on Drive"}
        </Button>
      )}

      {status?.folderId && (
        <div className="space-y-3">
          <a href={status.folderUrl!} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
            <FolderOpen size={14} />
            <span className="flex-1 truncate">Open Drive Folder</span>
            <ExternalLink size={12} />
          </a>

          {memoriesWithImages.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-white/40 font-medium">Upload memories to Drive:</p>
              {memoriesWithImages.map(m => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate text-white/60">{m.title}</span>
                  <span className="text-xs text-white/30">{m.images.length} photo{m.images.length !== 1 ? "s" : ""}</span>
                  {uploadedIds.has(m.id) ? (
                    <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={12} />Uploaded</span>
                  ) : (
                    <button
                      onClick={() => uploadMemory(m.id)}
                      disabled={uploading === m.id}
                      className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg flex items-center gap-1 disabled:opacity-50"
                    >
                      {uploading === m.id ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                      {uploading === m.id ? "Uploading…" : "Upload"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {memoriesWithImages.length === 0 && (
            <p className="text-xs text-white/30 text-center py-2">Add memories with photos to upload them to Drive</p>
          )}
        </div>
      )}

      {memoriesWithImages.length > 0 && (
        <div className="border-t border-white/10 pt-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center">
              <Smartphone size={16} className="text-white/50" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Save to Device</h3>
              <p className="text-xs text-white/40">Download all photos as a ZIP file</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-center"
            onClick={downloadToDevice}
            disabled={downloading}
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {downloading ? "Preparing download…" : `Download ${memoriesWithImages.reduce((s, m) => s + m.images.length, 0)} photos`}
          </Button>
          <p className="text-xs text-white/30 text-center">Saves a ZIP with photos grouped by memory</p>
        </div>
      )}
    </div>
  );
}
