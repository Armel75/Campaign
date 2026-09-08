/**
 * Petit cache mémoire à expiration (TTL).
 * Simple et suffisant pour un processus API unique (PM2 single process).
 * Les dashboards sont des données read-heavy qui changent peu : un TTL court
 * (2 min) évite de recalculer à chaque ouverture sans risque de données trop
 * périmées.
 */
type CacheEntry<T> = { value: T; expiresAt: number };

export const DASHBOARD_CACHE_TTL_MS = 120_000; // 2 minutes

export class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>();

  constructor(private ttlMs: number) {}

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}
