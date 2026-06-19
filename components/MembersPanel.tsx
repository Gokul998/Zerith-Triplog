"use client";
import { useCallback, useEffect, useState } from "react";
import { Users, UserPlus, Mail, Trash2, Crown, Clock } from "lucide-react";
import { apiGet, apiPost, apiDelete, getUser } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface Member { id: string; name: string; email: string; avatar_color: string; role: string; }
interface Invite { id: string; email: string; status: string; }

export function MembersPanel({ tripId, ownerId }: { tripId: string; ownerId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteResult, setInviteResult] = useState<{ inviteUrl: string; emailSent: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  const me = getUser();

  const load = useCallback(() => {
    apiGet<Member[]>(`/api/trips/${tripId}/members`).then(setMembers);
    apiGet<Invite[]>(`/api/trips/${tripId}/members/pending-invites`).then(setPendingInvites).catch(() => {});
  }, [tripId]);

  useEffect(() => { load(); }, [load]);

  async function invite() {
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await apiPost<any>(`/api/trips/${tripId}/members/invite`, { email: email.trim() });
      setInviteResult(res);
      setEmail("");
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member?")) return;
    await apiDelete(`/api/trips/${tripId}/members/${memberId}`);
    load();
  }

  async function revokeInvite(inviteId: string) {
    if (!confirm("Revoke this invite?")) return;
    await apiDelete(`/api/trips/${tripId}/members/invites/${inviteId}`);
    load();
  }

  return (
    <div className="bg-[#1e293b] rounded-2xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Users size={16} className="text-indigo-500" />Members ({1 + members.length + pendingInvites.length})
        </h3>
        <Button size="sm" variant="secondary" onClick={() => setShowInvite(true)}>
          <UserPlus size={14} />Invite
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: me?.avatar_color ?? "#6366f1" }}>
            {me?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{me?.name} <span className="text-xs text-indigo-400">(you)</span></p>
            <p className="text-xs text-white/40 truncate">{me?.email}</p>
          </div>
          {me?.id === ownerId && <Crown size={14} className="text-yellow-500 shrink-0" />}
        </div>

        {members.filter(m => m.id !== me?.id).map(m => (
          <div key={m.id} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: m.avatar_color }}>
              {m.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{m.name}</p>
              <p className="text-xs text-white/40 truncate">{m.email}</p>
            </div>
            {me?.id === ownerId && (
              <button onClick={() => removeMember(m.id)} className="p-1 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400"><Trash2 size={14} /></button>
            )}
          </div>
        ))}

        {pendingInvites.map(inv => (
          <div key={inv.id} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <Clock size={14} className="text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/50 truncate">{inv.email}</p>
              <p className="text-xs text-orange-500">Invite pending</p>
            </div>
            {me?.id === ownerId && (
              <button onClick={() => revokeInvite(inv.id)} className="p-1 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400" title="Revoke invite"><Trash2 size={14} /></button>
            )}
          </div>
        ))}
      </div>

      <Modal open={showInvite} onClose={() => { setShowInvite(false); setInviteResult(null); }} title="Invite Member">
        {inviteResult ? (
          <div className="space-y-3">
            <div className={`p-3 rounded-lg text-sm ${inviteResult.emailSent ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
              {inviteResult.emailSent ? "✓ Invite email sent! They'll appear here once they accept." : "Email not configured — share this link manually:"}
            </div>
            {!inviteResult.emailSent && (
              <>
                <div className="bg-white/5 rounded-lg p-3 text-sm break-all text-white/50 border border-white/10">{inviteResult.inviteUrl}</div>
                <Button onClick={() => navigator.clipboard.writeText(inviteResult.inviteUrl)} variant="secondary" className="w-full justify-center">Copy Link</Button>
              </>
            )}
            <Button onClick={() => setInviteResult(null)} className="w-full justify-center">Invite Another</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input label="Email address" id="invite-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="friend@example.com" />
            <p className="text-xs text-white/40">They'll receive a join link and appear here once accepted.</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 justify-center" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button className="flex-1 justify-center" onClick={invite} disabled={!email.trim() || sending}>
                <Mail size={14} />{sending ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
