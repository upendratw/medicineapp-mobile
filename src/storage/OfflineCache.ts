import AsyncStorage from '@react-native-async-storage/async-storage';

export type OfflineCacheKey =
  'ui-config' | 'medication-summary' | 'schedule-summary';
export type CachedValue<T> = Readonly<{
  value: T;
  stale: boolean;
  cachedAt: number;
}>;
type Storage = Pick<
  typeof AsyncStorage,
  'getItem' | 'setItem' | 'removeItem' | 'getAllKeys' | 'multiRemove'
>;
type Envelope = {
  schema: 1;
  cachedAt: number;
  expiresAt: number;
  staleUntil: number;
  value: unknown;
};
const PREFIX = 'medicineapp.cache.v1.';
const INDEX = `${PREFIX}index`;
const MAX_ENTRIES = 20;
const MAX_ITEM_BYTES = 8_192;
const MAX_TOTAL_BYTES = 65_536;
const forbidden =
  /token|secret|prescription|ocr|symptom|voice|audio|emergency|caregiver|history|clinical|interaction/i;

export class BoundedOfflineCache {
  constructor(
    private readonly storage: Storage = AsyncStorage,
    private readonly now = () => Date.now(),
  ) {}
  private key(key: OfflineCacheKey) {
    if (forbidden.test(key)) throw new Error('Cache category is not permitted');
    return `${PREFIX}${key}`;
  }
  async get<T>(
    key: OfflineCacheKey,
    allowStale = false,
  ): Promise<CachedValue<T> | null> {
    const storageKey = this.key(key);
    try {
      const raw = await this.storage.getItem(storageKey);
      if (!raw) return null;
      const item = JSON.parse(raw) as Envelope;
      if (
        item.schema !== 1 ||
        !Number.isFinite(item.expiresAt) ||
        !Number.isFinite(item.staleUntil)
      )
        throw new Error('Invalid cache envelope');
      const current = this.now();
      if (
        current > item.staleUntil ||
        (current > item.expiresAt && !allowStale)
      ) {
        await this.storage.removeItem(storageKey);
        return null;
      }
      return {
        value: item.value as T,
        stale: current > item.expiresAt,
        cachedAt: item.cachedAt,
      };
    } catch {
      await this.storage.removeItem(storageKey);
      return null;
    }
  }
  async set<T>(key: OfflineCacheKey, value: T, ttlMs: number): Promise<void> {
    if (!Number.isInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 86_400_000)
      throw new Error('Cache TTL is outside permitted bounds');
    const cachedAt = this.now();
    const envelope: Envelope = {
      schema: 1,
      cachedAt,
      expiresAt: cachedAt + ttlMs,
      staleUntil: cachedAt + ttlMs * 2,
      value,
    };
    const raw = JSON.stringify(envelope);
    if (raw.length > MAX_ITEM_BYTES)
      throw new Error('Cache item exceeds size limit');
    const index = await this.readIndex();
    const next = [
      ...index.filter((item) => item.key !== key),
      { key, size: raw.length, cachedAt },
    ].sort((a, b) => b.cachedAt - a.cachedAt);
    let total = 0;
    const keep = next.filter(
      (item, position) =>
        position < MAX_ENTRIES && (total += item.size) <= MAX_TOTAL_BYTES,
    );
    const removed = next.filter((item) => !keep.includes(item));
    if (removed.length)
      await this.storage.multiRemove(removed.map((item) => this.key(item.key)));
    await this.storage.setItem(this.key(key), raw);
    await this.storage.setItem(INDEX, JSON.stringify(keep));
  }
  async remove(key: OfflineCacheKey) {
    await this.storage.removeItem(this.key(key));
  }
  async clear() {
    const keys = (await this.storage.getAllKeys()).filter((key) =>
      key.startsWith(PREFIX),
    );
    if (keys.length) await this.storage.multiRemove(keys);
  }
  async clearExpired() {
    const index = await this.readIndex();
    await Promise.all(index.map((item) => this.get(item.key)));
  }
  private async readIndex(): Promise<
    { key: OfflineCacheKey; size: number; cachedAt: number }[]
  > {
    try {
      const value = JSON.parse((await this.storage.getItem(INDEX)) ?? '[]');
      return Array.isArray(value)
        ? value.filter(
            (item) =>
              item &&
              ['ui-config', 'medication-summary', 'schedule-summary'].includes(
                item.key,
              ),
          )
        : [];
    } catch {
      await this.storage.removeItem(INDEX);
      return [];
    }
  }
}
export const offlineCache = new BoundedOfflineCache();

export function requireOnline(online: boolean): void {
  if (!online)
    throw new Error(
      'This action requires a network connection and was not queued.',
    );
}
