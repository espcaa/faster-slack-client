import { createSignal } from "solid-js";
import { Events } from "@wailsio/runtime";
import { ResolveEmojis } from "../../bindings/fastslack/slackservice";
import type { Emoji } from "../../bindings/fastslack/shared/models";

// Per-workspace, in-memory cache of resolved emoji. Backend has its own LRU;
// this one exists so a render burst that hits the same emoji 50 times only
// triggers one IPC call. The backend invalidates on `emoji_changed`; we react
// to the same event below by clearing this cache and bumping the version.
const cache = new Map<string, Map<string, Emoji | null>>();

type Pending = {
  names: Set<string>;
  resolvers: Map<string, Array<(e: Emoji | null) => void>>;
  scheduled: boolean;
};
const pending = new Map<string, Pending>();

// Reactive version that consumers can read to re-run their resources when
// the emoji set changes for the workspace.
const [emojiVersion, setEmojiVersion] = createSignal(0);
export { emojiVersion };

function bucket(ws: string): Pending {
  let p = pending.get(ws);
  if (!p) {
    p = { names: new Set(), resolvers: new Map(), scheduled: false };
    pending.set(ws, p);
  }
  return p;
}

function wsCache(ws: string): Map<string, Emoji | null> {
  let c = cache.get(ws);
  if (!c) {
    c = new Map();
    cache.set(ws, c);
  }
  return c;
}

async function flush(ws: string) {
  const p = pending.get(ws);
  if (!p) return;
  pending.delete(ws);

  const names = [...p.names];
  const resolvers = p.resolvers;
  const c = wsCache(ws);

  let results: Emoji[] = [];
  try {
    results = (await ResolveEmojis(ws, names)) ?? [];
  } catch (err) {
    console.error("Failed to resolve emojis:", err);
  }

  const byName = new Map<string, Emoji>();
  for (const e of results) byName.set(e.name, e);

  for (const name of names) {
    const e = byName.get(name) ?? null;
    c.set(name, e);
    const fns = resolvers.get(name);
    if (fns) for (const fn of fns) fn(e);
  }
}

export function getEmoji(ws: string, name: string): Promise<Emoji | null> {
  const c = wsCache(ws);
  if (c.has(name)) return Promise.resolve(c.get(name)!);

  return new Promise((resolve) => {
    const p = bucket(ws);
    p.names.add(name);
    const list = p.resolvers.get(name) ?? [];
    list.push(resolve);
    p.resolvers.set(name, list);

    if (!p.scheduled) {
      p.scheduled = true;
      // Coalesce all requests made within the current microtask burst
      // into a single IPC call.
      queueMicrotask(() => flush(ws));
    }
  });
}

// When the backend tells us the emoji set changed, drop the frontend cache
// and bump the version so reactive consumers refetch.
Events.On("slack:emoji_changed", () => {
  cache.clear();
  setEmojiVersion((v) => v + 1);
});
