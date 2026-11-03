/**
 * A localStorage double for tests that build their own window. It works like
 * a real store (keys are separate, writes read back, removal works), so the
 * consent store's write probe succeeds and "unset" or a stored choice reads
 * as it would in a healthy browser. A double that answers one value for every
 * key, or has no setItem, reads as "nothing can persist" and so as declined.
 */
export interface StorageFaults {
  getThrows?: boolean;
  setThrows?: boolean;
}

export type StorageDouble = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** A store holding `consent` (or nothing) under the consent key, with optional faults. */
export function storageDouble(consent: string | null = null, faults: StorageFaults = {}): StorageDouble {
  const items = new Map<string, string>();
  if (consent !== null) items.set("site-consent", consent);
  return {
    getItem: (key) => {
      if (faults.getThrows) throw new Error("SecurityError");
      return items.get(key) ?? null;
    },
    setItem: (key, value) => {
      if (faults.setThrows) throw new Error("QuotaExceededError");
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}
