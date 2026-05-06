import { ResolveBots } from "../../bindings/fastslack/slackservice";
import type { AppProfile } from "../../bindings/fastslack/shared";

const cache = new Map<string, AppProfile>();
const queue = new Map<
  string,
  { ids: Set<string>; waiters: { id: string; resolve: (p: AppProfile | null) => void }[] }
>();

function flush(ws: string) {
  const batch = queue.get(ws);
  if (!batch) return;
  queue.delete(ws);

  const toFetch = [...batch.ids].filter((id) => !cache.has(`${ws}:${id}`));

  if (toFetch.length === 0) {
    for (const w of batch.waiters) {
      w.resolve(cache.get(`${ws}:${w.id}`) ?? null);
    }
    return;
  }

  ResolveBots(ws, toFetch)
    .then((profiles) => {
      for (const p of profiles ?? []) {
        cache.set(`${ws}:${p.id}`, p);
      }
    })
    .catch(() => {})
    .finally(() => {
      for (const w of batch.waiters) {
        w.resolve(cache.get(`${ws}:${w.id}`) ?? null);
      }
    });
}

export function getCachedBot(ws: string, id: string): AppProfile | null {
  return cache.get(`${ws}:${id}`) ?? null;
}

export function resolveBot(ws: string, id: string): Promise<AppProfile | null> {
  const cached = cache.get(`${ws}:${id}`);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    let batch = queue.get(ws);
    if (!batch) {
      batch = { ids: new Set(), waiters: [] };
      queue.set(ws, batch);
      queueMicrotask(() => flush(ws));
    }
    batch.ids.add(id);
    batch.waiters.push({ id, resolve });
  });
}

export async function resolveBots(
  ws: string,
  ids: string[],
): Promise<AppProfile[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const results = await Promise.all(unique.map((id) => resolveBot(ws, id)));
  return results.filter((p): p is AppProfile => !!p);
}

export function primeBot(ws: string, profile: AppProfile) {
  if (profile?.id) cache.set(`${ws}:${profile.id}`, profile);
}

export function invalidateBot(ws: string, id: string) {
  cache.delete(`${ws}:${id}`);
}
