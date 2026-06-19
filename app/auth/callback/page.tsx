"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuth } from "@/lib/api";

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const user = params.get("user");
    if (token && user) {
      try {
        const userData = JSON.parse(decodeURIComponent(user));
        // Write directly to localStorage then verify before redirecting
        localStorage.setItem("tl_token", token);
        localStorage.setItem("tl_user", JSON.stringify(userData));
        // Verify it was saved
        const saved = localStorage.getItem("tl_token");
        if (saved === token) {
          window.location.href = "/dashboard";
        } else {
          router.replace("/");
        }
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
