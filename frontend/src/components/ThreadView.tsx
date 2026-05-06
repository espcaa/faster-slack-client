import { createEffect, createSignal, on, Show } from "solid-js";
import styles from "./MessageList.module.css";
import threadStyles from "./ThreadView.module.css";
import Scrollbar from "./misc/Scrollbar";
import { Message } from "../../bindings/fastslack/shared";
import { GetThreadMessages } from "../../bindings/fastslack/slackservice";
import { chatStore, setChatStore } from "../ChatStore";
import ChatInput from "./ChatInput";
import MessageStream from "./MessageStream";
import {
  dedupe,
  fetchProfiles,
  mergeIncoming,
  useSlackMessageEvents,
} from "../utils/messageStream";

const threadScrollPositions = new Map<string, number>();

export default function ThreadView(props: {
  teamID: string;
  channelID: string;
  parentMessage: Message;
}) {
  let containerRef!: HTMLDivElement;
  const [loading, setLoading] = createSignal(false);
  const [fetchingOlder, setFetchingOlder] = createSignal(false);
  const [nextCursor, setNextCursor] = createSignal<string | null>(null);

  const threadTS = () => props.parentMessage.ts;
  const replies = () => chatStore.threadReplies[threadTS()] || [];
  const setReplies = (updater: (prev: Message[]) => Message[]) =>
    setChatStore("threadReplies", threadTS(), (prev) => updater(prev || []));

  const loadReplies = async () => {
    setLoading(true);
    setReplies(() => [props.parentMessage]);
    setNextCursor(null);

    const first = await GetThreadMessages(
      props.teamID,
      props.channelID,
      threadTS(),
      "",
    );
    let msgs = first?.messages || [];
    let cursor = first?.next_cursor || "";

    if (cursor === "cache") {
      const fresh = await GetThreadMessages(
        props.teamID,
        props.channelID,
        threadTS(),
        "cache",
      );
      msgs = fresh?.messages || [];
      cursor = fresh?.next_cursor || "";
    }

    setReplies(() => dedupe(msgs));
    setNextCursor(cursor || null);
    fetchProfiles(props.teamID, msgs);
    setLoading(false);
    requestAnimationFrame(() => {
      containerRef.scrollTop = threadScrollPositions.get(threadTS()) ?? 0;
    });
  };

  const loadOlderReplies = async () => {
    const cursor = nextCursor();
    if (!cursor || fetchingOlder()) return;

    setFetchingOlder(true);
    try {
      const page = await GetThreadMessages(
        props.teamID,
        props.channelID,
        threadTS(),
        cursor,
      );
      if (page) {
        setReplies((prev) => dedupe([...prev, ...page.messages]));
        setNextCursor(page.next_cursor || null);
        fetchProfiles(props.teamID, page.messages);
      }
    } finally {
      setFetchingOlder(false);
    }
  };

  createEffect(
    on(threadTS, (ts, prevTS) => {
      if (prevTS) threadScrollPositions.set(prevTS, containerRef.scrollTop);
      loadReplies();
    }),
  );

  const handleScroll = (e: Event) => {
    const el = e.currentTarget as HTMLDivElement;
    threadScrollPositions.set(threadTS(), el.scrollTop);
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
    if (nearBottom && !fetchingOlder()) loadOlderReplies();
  };

  useSlackMessageEvents({
    teamID: props.teamID,
    accept: (data) =>
      data.channel === props.channelID &&
      (data.thread_ts === threadTS() || data.ts === threadTS()),
    onNew: (msg) => setReplies((prev) => mergeIncoming(prev, msg, false)),
    onChanged: (updated) =>
      setReplies((prev) =>
        prev.map((m) => (m.ts === updated.ts ? updated : m)),
      ),
    onDeleted: (ts) => setReplies((prev) => prev.filter((m) => m.ts !== ts)),
  });

  return (
    <div class={threadStyles.panel}>
      <div class={threadStyles.header}>
        <span class={threadStyles.title}>Thread</span>
        <button
          class={threadStyles.close}
          onClick={() => {
            setChatStore("openThreads", props.channelID, undefined!);
            setChatStore({ threadTS: null, threadParent: null });
          }}
        >
          ✕
        </button>
      </div>
      <div class={threadStyles.listWrapper}>
        <div
          class={threadStyles.list}
          ref={containerRef}
          onScroll={handleScroll}
        >
          <MessageStream
            messages={replies()}
            direction="down"
            channelID={props.channelID}
            workspaceID={props.teamID}
            threadContext="thread"
            renderAfter={(_msg, i) => (
              <Show when={i === 0 && replies().length > 1}>
                <div class={threadStyles.replyDivider}>
                  <span class={threadStyles.replyCount}>
                    {(props.parentMessage.reply_count || 0) - 1}{" "}
                    {(props.parentMessage.reply_count || 0) - 1 === 1
                      ? "reply"
                      : "replies"}
                  </span>
                  <div class={threadStyles.dividerLine} />
                </div>
              </Show>
            )}
          />

          <Show when={loading()}>
            <div class={styles.loading}>Loading thread...</div>
          </Show>
          <Show when={fetchingOlder()}>
            <div class={styles.loading}>Loading more replies...</div>
          </Show>
          <div class={threadStyles.inputContainer}>
            <ChatInput
              teamID={props.teamID}
              channelID={props.channelID}
              threadTS={threadTS()}
            />
          </div>
        </div>
        <Scrollbar container={containerRef} />
      </div>
    </div>
  );
}
