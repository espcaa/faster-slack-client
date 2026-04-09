import { createEffect, createSignal, For, on, Show } from "solid-js";
import styles from "./MessageList.module.css";
import { Message, UserProfile } from "../../bindings/fastslack/shared";
import {
  GetMessages,
  ResolveUsers,
} from "../../bindings/fastslack/slackservice";
import MessageItem from "./MessageItem";
import { chatStore, setChatStore, scrollPositions } from "../ChatStore";

export default function MessageList(props: {
  teamID: string;
  channelID: string;
}) {
  let containerRef!: HTMLDivElement;
  let switchingChannel = false;
  const [loading, setLoading] = createSignal(false);
  const [fetchingOlder, setFetchingOlder] = createSignal(false);
  const [profiles, setProfiles] = createSignal<Record<string, UserProfile>>({});

  const messages = () => chatStore.messages;

  const fetchProfiles = async (msgs: Message[]) => {
    const userIDs = [...new Set(msgs.map((m) => m.user))];
    const resolved = await ResolveUsers(props.teamID, userIDs);
    const profileMap: Record<string, UserProfile> = {};
    for (const p of resolved) profileMap[p.id] = p;
    setProfiles((prev) => ({ ...prev, ...profileMap }));
  };

  const loadMessages = async (id: string) => {
    setLoading(true);
    setChatStore({ messages: [], nextCursor: null });
    const res = await GetMessages(props.teamID, id, "");
    if (res) {
      setChatStore({
        messages: [...res.messages],
        nextCursor: res.next_cursor || null,
      });
      fetchProfiles(res.messages);
    }
    setLoading(false);
  };

  const loadOlderMessages = async () => {
    const cursor = chatStore.nextCursor;
    if (!cursor || fetchingOlder()) return;

    setFetchingOlder(true);
    try {
      const res = await GetMessages(props.teamID, props.channelID, cursor);

      if (res) {
        setChatStore({
          messages: [...messages(), ...res.messages],
          nextCursor: res.next_cursor || null,
        });

        fetchProfiles(res.messages);
      }
    } finally {
      setFetchingOlder(false);
    }
  };

  createEffect(
    on(
      () => props.channelID,
      (id, prevID) => {
        if (prevID) {
          scrollPositions.set(prevID, containerRef.scrollTop);
        }
        switchingChannel = true;
        loadMessages(id).then(() => {
          requestAnimationFrame(() => {
            containerRef.scrollTop = scrollPositions.get(id) ?? 0;
            switchingChannel = false;
          });
        });
      },
    ),
  );

  const handleScroll = (e: Event) => {
    if (switchingChannel) return;
    const el = e.currentTarget as HTMLDivElement;

    scrollPositions.set(props.channelID, el.scrollTop);

    const atVisualTop = el.scrollHeight - el.clientHeight + el.scrollTop <= 5;
    if (atVisualTop && !fetchingOlder()) {
      loadOlderMessages();
    }
  };

  return (
    <div class={styles.list} ref={containerRef} onScroll={handleScroll}>
      <Show when={loading()}>
        <div class={styles.loading}>Loading history...</div>
      </Show>

      <For each={messages()}>
        {(msg, i) => {
          const next = () => messages()[i() + 1];
          const showHeader = () =>
            i() === messages().length - 1 || next()?.user !== msg.user;
          return (
            <MessageItem
              message={msg}
              profile={profiles()[msg.user]}
              showUser={showHeader()}
              workspaceID={props.teamID}
            />
          );
        }}
      </For>

      <Show when={fetchingOlder()}>
        <div class={styles.loading}>Fetching older messages...</div>
      </Show>
    </div>
  );
}
