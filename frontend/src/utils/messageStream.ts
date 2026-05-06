import { onCleanup, onMount } from "solid-js";
import { Events } from "@wailsio/runtime";
import { Message } from "../../bindings/fastslack/shared";
import { resolveUsers } from "./userResolver";
import { setChatStore } from "../ChatStore";

export function dedupe(msgs: Message[]): Message[] {
  const seen = new Set<string>();
  return msgs.filter((m) => {
    if (seen.has(m.ts)) return false;
    seen.add(m.ts);
    return true;
  });
}

export function mergeIncoming(
  prev: Message[],
  msg: Message,
  prepend: boolean,
): Message[] {
  if (prev.some((m) => m.ts === msg.ts)) return prev;
  const filtered = prev.filter(
    (m) =>
      !(
        m.ts.includes(".pending") &&
        m.user === msg.user &&
        m.text === msg.text
      ),
  );
  return prepend ? [msg, ...filtered] : [...filtered, msg];
}

export async function fetchProfiles(teamID: string, msgs: Message[]) {
  const userIDs = [...new Set(msgs.map((m) => m.user).filter(Boolean))];
  if (!userIDs.length) return;
  const resolved = await resolveUsers(teamID, userIDs);
  const map: Record<string, any> = {};
  for (const p of resolved) map[p.id] = p;
  setChatStore("profiles", (prev) => ({ ...prev, ...map }));
}

interface SlackMessageEventHandlers {
  accept: (data: any) => boolean;
  onNew: (msg: Message) => void;
  onChanged: (msg: Message) => void;
  onDeleted: (deletedTS: string) => void;
  // callback for rejected events, good for updating threads info
  onRejected?: (data: any) => void;
  teamID: string;
}

export function useSlackMessageEvents(opts: SlackMessageEventHandlers) {
  const parse = (event: any) =>
    typeof event.data === "string" ? JSON.parse(event.data) : event.data;

  onMount(() => {
    const offMessage = Events.On("slack:message", (event: any) => {
      const data = parse(event);
      if (!opts.accept(data)) {
        opts.onRejected?.(data);
        return;
      }
      const msg = data as Message;
      opts.onNew(msg);
      fetchProfiles(opts.teamID, [msg]);
    });

    const offChanged = Events.On("slack:message_changed", (event: any) => {
      const data = parse(event);
      const updated = data.message as Message;
      if (!opts.accept({ ...data, ...updated })) return;
      opts.onChanged(updated);
    });

    const offDeleted = Events.On("slack:message_deleted", (event: any) => {
      const data = parse(event);
      if (!opts.accept(data)) return;
      opts.onDeleted(data.deleted_ts);
    });

    onCleanup(() => {
      offMessage();
      offChanged();
      offDeleted();
    });
  });
}
