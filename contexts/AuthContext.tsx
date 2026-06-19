"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setAuth, clearAuth, getUser, apiPost } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";

interface User { id: string; name: string; email: string; avatar_color: string; }
interface AuthCtx { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; register: (name: string, email: string, password: string) => Promise<void>; logout: () => void; }

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u) connectSocket();
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const res = await apiPost<{ token: string; user: User }>("/api/auth/login", { email, password });
    setAuth(res.token, res.user);
    setUser(res.user);
    connectSocket();
  }

  async function register(name: string, email: string, password: string) {
    const res = await apiPost<{ token: string; user: User }>("/api/auth/register", { name, email, password });
    setAuth(res.token, res.user);
    setUser(res.user);
    connectSocket();
  }

  function logout() {
    clearAuth();
    setUser(null);
    disconnectSocket();
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
