/**
 * localStorage per app-bruker. Flere brukere kan logge inn i samme nettleser,
 * så hver nøkkel får brukerens id som suffiks.
 *
 * Data fra før appen hadde flere brukere (nøkler uten suffiks) flyttes én gang
 * til den første brukeren som leser dem i denne nettleseren.
 */

let currentUserId: string | null = null;

/** Settes av AppShell før skjermene leser lagrede data. */
export function setStorageUser(userId: string | null): void {
  currentUserId = userId;
}

function scoped(base: string): string {
  return currentUserId ? `${base}:${currentUserId}` : base;
}

export function readUserItem(base: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const key = scoped(base);
    const value = window.localStorage.getItem(key);
    if (value != null || key === base) return value;
    const legacy = window.localStorage.getItem(base);
    if (legacy != null) {
      window.localStorage.setItem(key, legacy);
      window.localStorage.removeItem(base);
    }
    return legacy;
  } catch {
    return null;
  }
}

export function writeUserItem(base: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(scoped(base), value);
  } catch {
    // ignore (privat modus, full lagring osv.)
  }
}
