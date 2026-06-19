"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuth } from "@/lib/api";
import { toast } from "@/components/ui/Toaster";

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const user = params.get("user");
    const isNew = params.get("new") === "1";
    if (token && user) {
      try {
        const userData = JSON.parse(decodeURIComponent(user));
        localStorage.setItem("tl_token", token);
        localStorage.setItem("tl_user", JSON.stringify(userData));
        window.dispatchEvent(new Event("auth-updated"));
        if (isNew) {
          toast(`Welcome to TripLog, ${userData.name?.split(" ")[0] || "there"}! 🎉`, "success");
        } else {
          toast("Welcome back! ✈️", "success");
        }
        router.push("/dashboard");
      } catch {
        router.replace("/");
      }
    } else {
      router.replace("/");
    }
  }, [params, router]);

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-bounce">✈️</div>
        <p className="text-white/60 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">✈️</div>
          <p className="text-white/60 text-sm">Signing you in...</p>
        </div>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
