import { createEffect, createSignal, on, Show } from "solid-js";
import styles from "./MessageList.module.css";
import { GetMessages } from "../../bindings/fastslack/slackservice";
import { chatStore, setChatStore, scrollPositions } from "../ChatStore";
import SlickScrollbar from "./misc/Scrollbar";
import ChatInput from "./ChatInput";
import MessageStream from "./MessageStream";
import {
  fetchProfiles,
  mergeIncoming,
  useSlackMessageEvents,
} from "../utils/messageStream";
import ChannelHeader from "./misc/ChannelHeader";

export default function MessageList(props: {
  teamID: string;
  channelID: string;
}) {
  let containerRef!: HTMLDivElement;
  let switchingChannel = false;
  const [fetchingOlder, setFetchingOlder] = createSignal(false);

  const messages = () => chatStore.messages;

  const loadMessages = async (id: string) => {
    setChatStore({ messages: [], nextCursor: null });
    const res = await GetMessages(props.teamID, id, "");
    if (!res) return;
    setChatStore({
      messages: [...res.messages],
      nextCursor: res.next_cursor || null,
    });
    fetchProfiles(props.teamID, res.messages);

    // if it's cache, try fetching fresh data in the background and update if different
    if (res.next_cursor === "cache") {
      const fresh = await GetMessages(props.teamID, id, "cache");
      if (fresh) {
        setChatStore({
          messages: [...fresh.messages],
          nextCursor: fresh.next_cursor || null,
        });
        fetchProfiles(props.teamID, fresh.messages);
      }
    }
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
        fetchProfiles(props.teamID, res.messages);
      }
    } finally {
      setFetchingOlder(false);
    }
  };

  createEffect(
    on(
      () => props.channelID,
      (id, prevID) => {
        if (prevID) scrollPositions.set(prevID, containerRef.scrollTop);
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
    if (atVisualTop && !fetchingOlder()) loadOlderMessages();
  };

  useSlackMessageEvents({
    teamID: props.teamID,
    accept: (data) =>
      data.channel === props.channelID &&
      (!data.thread_ts || data.thread_ts === data.ts),
    onNew: (msg) =>
      setChatStore("messages", (prev) => mergeIncoming(prev, msg, true)),
    onChanged: (updated) =>
      setChatStore("messages", (m) => m.ts === updated.ts, updated),
    onDeleted: (ts) =>
      setChatStore("messages", (prev) => prev.filter((m) => m.ts !== ts)),
    onRejected: (data) => {
      // update parent's reply count
      if (
        data.channel === props.channelID &&
        data.thread_ts &&
        data.thread_ts !== data.ts
      ) {
        setChatStore(
          "messages",
          (m) => m.ts === data.thread_ts,
          (parent) => ({
            ...parent,
            reply_count: (parent.reply_count || 0) + 1,
            latest_reply: data.ts,
            reply_users: parent.reply_users
              ? parent.reply_users.includes(data.user)
                ? parent.reply_users
                : [...parent.reply_users, data.user]
              : [data.user],
          }),
        );
      }
    },
  });

  return (
    <div class={styles.container}>
      <div class={styles.header}>
        <ChannelHeader teamID={props.teamID} channelID={props.channelID} />
      </div>
      <div class={styles.listWrapper}>
        <div class={styles.list} ref={containerRef} onScroll={handleScroll}>
          <MessageStream
            messages={messages()}
            direction="up"
            channelID={props.channelID}
            workspaceID={props.teamID}
            threadContext="list"
            onThreadClick={(message) =>
              setChatStore({
                threadTS: message.thread_ts || message.ts,
                threadParent: message,
                openThreads: {
                  ...chatStore.openThreads,
                  [props.channelID]: {
                    threadTs: message.thread_ts || message.ts,
                    threadParent: message,
                  },
                },
              })
            }
          />
          <Show when={fetchingOlder()}>
            <div class={styles.loading}>Fetching older messages...</div>
          </Show>
        </div>
        <Show when={containerRef}>
          <SlickScrollbar container={containerRef} reversed />
        </Show>
      </div>
      <ChatInput teamID={props.teamID} channelID={props.channelID} />
    </div>
  );
}
