const KEY = "sqlplay.userDatasets.v1";

export interface UserDataset {
  id: string;
  name: string;
  /** Millisecond timestamp captured by the caller. */
  createdAt: number;
  /** Base64 of the serialized SQLite database. */
  b64: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000; // avoid call-stack limits on large buffers
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function listUserDatasets(): UserDataset[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserDataset[]) : [];
  } catch {
    return [];
  }
}

function persist(list: UserDataset[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getUserDataset(id: string): UserDataset | undefined {
  return listUserDatasets().find((d) => d.id === id);
}

/**
 * Save (or overwrite by name) a dataset. Throws if storage is full so the
 * caller can surface a friendly message.
 */
export function saveUserDataset(
  name: string,
  bytes: Uint8Array,
  at: number
): { list: UserDataset[]; saved: UserDataset } {
  const list = listUserDatasets();
  const b64 = bytesToBase64(bytes);
  const existing = list.find((d) => d.name === name);
  let saved: UserDataset;
  if (existing) {
    existing.b64 = b64;
    existing.createdAt = at;
    saved = existing;
  } else {
    saved = { id: crypto.randomUUID(), name, createdAt: at, b64 };
    list.push(saved);
  }
  persist(list); // may throw QuotaExceededError
  return { list, saved };
}

export function deleteUserDataset(id: string): UserDataset[] {
  const list = listUserDatasets().filter((d) => d.id !== id);
  persist(list);
  return list;
}
