"use client";
import { useRouter } from "next/navigation";
import { Crown, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  message?: string;
}

export function UpgradeModal({ open, onClose, message }: Props) {
  const router = useRouter();
  return (
    <Modal open={open} onClose={onClose} title="">
      <div className="text-center py-2">
        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Crown size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Upgrade to Pro</h2>
        <p className="text-white/50 text-sm mb-6 leading-relaxed">
          {message || "This feature requires TripLog Pro. Unlock unlimited trips, AI features, and more."}
        </p>
        <div className="space-y-2">
          <Button
            className="w-full justify-center bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500"
            onClick={() => { onClose(); router.push("/pricing"); }}
          >
            See Plans
          </Button>
          <Button variant="secondary" className="w-full justify-center" onClick={onClose}>
            Maybe later
          </Button>
        </div>
      </div>
    </Modal>
  );
}
