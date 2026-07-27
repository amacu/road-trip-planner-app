import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS or
 * `localhost`) — it's undefined when the app is opened over a plain-HTTP
 * LAN address (e.g. testing on a phone via `next dev --hostname 0.0.0.0`).
 * These IDs are only ever used as temporary client-side keys for
 * optimistic UI state, never persisted, so a non-cryptographic fallback
 * is fine here.
 */
export function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
