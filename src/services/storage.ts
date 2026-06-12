import { get, set, del, keys } from "idb-keyval";

const STORAGE_PREFIX = "foodsafe_";

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await get(`${STORAGE_PREFIX}${key}`);
      return value ?? null;
    } catch {
      const local = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      return local ? JSON.parse(local) : null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await set(`${STORAGE_PREFIX}${key}`, value);
    } catch {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await del(`${STORAGE_PREFIX}${key}`);
    } catch {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    }
  },

  async getAllKeys(): Promise<string[]> {
    try {
      const allKeys = await keys();
      return allKeys
        .filter((k) => String(k).startsWith(STORAGE_PREFIX))
        .map((k) => String(k).replace(STORAGE_PREFIX, ""));
    } catch {
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(STORAGE_PREFIX))
        .map((k) => k.replace(STORAGE_PREFIX, ""));
    }
  },

  async clear(): Promise<void> {
    const allKeys = await this.getAllKeys();
    for (const key of allKeys) {
      await this.remove(key);
    }
  },
};

export async function initializeStorage() {
  const initialized = await storage.get<boolean>("initialized");
  if (!initialized) {
    await storage.set("initialized", true);
    await storage.set("version", "1.0.0");
  }
  return initialized;
}
