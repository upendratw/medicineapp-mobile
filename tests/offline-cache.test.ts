import { BoundedOfflineCache, requireOnline } from '@/storage/OfflineCache';

class MemoryStorage {
  data = new Map<string, string>();
  async getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  async removeItem(key: string) {
    this.data.delete(key);
  }
  async getAllKeys() {
    return [...this.data.keys()];
  }
  async multiRemove(keys: readonly string[]) {
    keys.forEach((key) => this.data.delete(key));
  }
}
test('cache returns fresh then explicitly stale data within its bounded stale window', async () => {
  let now = 1_000;
  const cache = new BoundedOfflineCache(new MemoryStorage(), () => now);
  await cache.set('schedule-summary', { count: 2 }, 1_000);
  expect(await cache.get('schedule-summary')).toMatchObject({
    value: { count: 2 },
    stale: false,
  });
  now = 2_500;
  expect(await cache.get('schedule-summary')).toBeNull();
  await cache.set('schedule-summary', { count: 2 }, 1_000);
  now = 4_000;
  expect(await cache.get('schedule-summary', true)).toMatchObject({
    stale: true,
  });
  now = 5_100;
  expect(await cache.get('schedule-summary', true)).toBeNull();
});
test('cache safely removes corruption and clears its namespace', async () => {
  const storage = new MemoryStorage();
  storage.data.set('medicineapp.cache.v1.ui-config', '{bad');
  const cache = new BoundedOfflineCache(storage);
  expect(await cache.get('ui-config')).toBeNull();
  await cache.set('ui-config', { value: true }, 1_000);
  await cache.clear();
  expect(storage.data.size).toBe(0);
});
test('cache enforces TTL and item-size bounds and offline writes fail without queueing', async () => {
  const cache = new BoundedOfflineCache(new MemoryStorage());
  await expect(cache.set('ui-config', {}, 1)).rejects.toThrow('TTL');
  await expect(
    cache.set('ui-config', { value: 'x'.repeat(9_000) }, 1_000),
  ).rejects.toThrow('size');
  expect(() => requireOnline(false)).toThrow('not queued');
  expect(() => requireOnline(true)).not.toThrow();
});
test('cache source allowlists categories and excludes high-risk payloads', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(process.cwd(), 'src/storage/OfflineCache.ts'),
    'utf8',
  );
  expect(source).toContain("'medication-summary'");
  expect(source).toContain("'schedule-summary'");
  expect(source).not.toMatch(
    /OfflineCacheKey.*token|OfflineCacheKey.*prescription|OfflineCacheKey.*symptom/i,
  );
});
