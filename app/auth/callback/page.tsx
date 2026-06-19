"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const user = params.get("user");
    if (token && user) {
      try {
        localStorage.setItem("tl_token", token);
        localStorage.setItem("tl_user", decodeURIComponent(user));
        router.replace("/dashboard");
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
