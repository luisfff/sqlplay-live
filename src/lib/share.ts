export interface SharedState {
  datasetId: string;
  query: string;
}

// Base64url helpers that round-trip Unicode safely.
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64: string): string {
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Build a shareable URL (state lives in the hash, so it never hits a server). */
export function encodeShareUrl(state: SharedState): string {
  const payload = toBase64Url(JSON.stringify(state));
  const base = location.origin + location.pathname;
  return `${base}#s=${payload}`;
}

/** Read shared state from the current URL hash, if present. */
export function decodeShareUrl(): SharedState | null {
  const m = location.hash.match(/[#&]s=([^&]+)/);
  if (!m) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(m[1]));
    if (typeof parsed?.query === "string" && typeof parsed?.datasetId === "string") {
      return parsed as SharedState;
    }
  } catch {
    /* malformed link — ignore */
  }
  return null;
}
