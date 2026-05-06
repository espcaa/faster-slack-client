import { ResolveUsers } from "../../bindings/fastslack/slackservice";
import type { UserProfile } from "../../bindings/fastslack/shared";

const cache = new Map<string, UserProfile>();
const queue = new Map<
  string,
  { ids: Set<string>; waiters: { id: string; resolve: (p: UserProfile | null) => void }[] }
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

  ResolveUsers(ws, toFetch)
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

export function getCachedUser(ws: string, id: string): UserProfile | null {
  return cache.get(`${ws}:${id}`) ?? null;
}

export function resolveUser(ws: string, id: string): Promise<UserProfile | null> {
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

export async function resolveUsers(
  ws: string,
  ids: string[],
): Promise<UserProfile[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const results = await Promise.all(unique.map((id) => resolveUser(ws, id)));
  return results.filter((p): p is UserProfile => !!p);
}

export function primeUser(ws: string, profile: UserProfile) {
  if (profile?.id) cache.set(`${ws}:${profile.id}`, profile);
}

export function invalidateUser(ws: string, id: string) {
  cache.delete(`${ws}:${id}`);
}
