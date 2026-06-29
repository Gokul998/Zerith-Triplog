const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tl_token");
}

export function getUser(): { id: string; name: string; email: string; avatar_color: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("tl_user");
  return raw ? JSON.parse(raw) : null;
}

export function setAuth(token: string, user: object) {
  localStorage.setItem("tl_token", token);
  localStorage.setItem("tl_user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("tl_token");
  localStorage.removeItem("tl_user");
}

export class UpgradeRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpgradeRequiredError";
  }
}

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") window.location.href = "/dashboard";
    throw new Error("Session expired. Please sign in again.");
  }
  if (res.status === 402) {
    const err = await res.json().catch(() => ({ message: "Upgrade required" }));
    throw new UpgradeRequiredError(err.message || "Upgrade to Pro to use this feature.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const apiGet = <T = any>(path: string) => api<T>(path);
export const apiPost = <T = any>(path: string, body: object) => api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const apiPut = <T = any>(path: string, body: object) => api<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const apiDelete = <T = any>(path: string) => api<T>(path, { method: "DELETE" });
