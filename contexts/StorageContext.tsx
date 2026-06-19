"use client";
import { createContext, useContext, type ReactNode } from "react";
import { getStorageProvider, type StorageProvider } from "@/lib/storage";

const StorageContext = createContext<StorageProvider | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const provider = getStorageProvider();
  return <StorageContext.Provider value={provider}>{children}</StorageContext.Provider>;
}

export function useStorage(): StorageProvider {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error("useStorage must be used within StorageProvider");
  return ctx;
}
