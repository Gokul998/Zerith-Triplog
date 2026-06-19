import { LocalStorageAdapter } from "./localAdapter";
import type { StorageProvider } from "./types";

let instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!instance) instance = new LocalStorageAdapter();
  return instance;
}

export type { StorageProvider };
