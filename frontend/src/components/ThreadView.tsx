import { createEffect, createSignal, For, on, Show } from "solid-js";
import styles from "./MessageList.module.css";
import threadStyles from "./ThreadView.module.css";
import Scrollbar from "./misc/Scrollbar";
import { Message, UserProfile } from "../../bindings/fastslack/shared";
import {
  GetThreadMessages,
  ResolveUsers,
} from "../../bindings/fastslack/slackservice";
import MessageItem from "./MessageItem";
import { setChatStore } from "../ChatStore";

const threadScrollPositions = new Map<string, number>();

export default function ThreadView(props: {
  teamID: string;
  channelID: string;
  parentMessage: Message;
}) {
  let containerRef!: HTMLDivElement;
  const [loading, setLoading] = createSignal(false);
  const [replies, setReplies] = createSignal<Message[]>([]);
  const [nextCursor, setNextCursor] = createSignal<string | null>(null);
  const [fetchingOlder, setFetchingOlder] = createSignal(false);
  const [profiles, setProfiles] = createSignal<Record<string, UserProfile>>({});

  const threadTS = () => props.parentMessage.ts;

  const fetchProfiles = async (msgs: Message[]) => {
    const userIDs = [...new Set(msgs.map((m) => m.user))];
    const resolved = await ResolveUsers(props.teamID, userIDs);
    const profileMap: Record<string, UserProfile> = {};
    for (const p of resolved) profileMap[p.id] = p;
    setProfiles((prev) => ({ ...prev, ...profileMap }));
  };

  const loadReplies = async () => {
    setLoading(true);
    setReplies([]);
    setNextCursor(null);
    const res = await GetThreadMessages(
      props.teamID,
      props.channelID,
      threadTS(),
      "",
    );
    if (res) {
      setReplies(res.messages);
      setNextCursor(res.next_cursor || null);
      fetchProfiles(res.messages);

      if (res.next_cursor === "cache") {
        const fresh = await GetThreadMessages(
          props.teamID,
          props.channelID,
          threadTS(),
          "cache",
        );
        if (fresh) {
          setReplies((prev) => {
            const existingTs = new Set(prev.map((m) => m.ts));
            const newMsgs = res.messages.filter((m) => !existingTs.has(m.ts));
            return [...prev, ...newMsgs];
          });
          setNextCursor(fresh.next_cursor || null);
          fetchProfiles(fresh.messages);
        }
      }
    }
    setLoading(false);
    requestAnimationFrame(() => {
      containerRef.scrollTop = threadScrollPositions.get(threadTS()) ?? 0;
    });
  };

  const loadMoreReplies = async () => {
    const cursor = nextCursor();
    if (!cursor || fetchingOlder()) return;

    setFetchingOlder(true);
    try {
      const res = await GetThreadMessages(
        props.teamID,
        props.channelID,
        threadTS(),
        cursor,
      );
      if (res) {
        setReplies((prev) => [...prev, ...res.messages]);
        setNextCursor(res.next_cursor || null);
        fetchProfiles(res.messages);
      }
    } finally {
      setFetchingOlder(false);
    }
  };

  createEffect(
    on(threadTS, (ts, prevTS) => {
      if (prevTS) {
        threadScrollPositions.set(prevTS, containerRef.scrollTop);
      }
      loadReplies();
    }),
  );

  const handleScroll = (e: Event) => {
    const el = e.currentTarget as HTMLDivElement;
    threadScrollPositions.set(threadTS(), el.scrollTop);

    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 5;
    if (atBottom && !fetchingOlder()) {
      loadMoreReplies();
    }
  };

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
          <Show when={loading()}>
            <div class={styles.loading}>Loading thread...</div>
          </Show>

          <For each={replies()}>
            {(msg, i) => {
              const prev = () => replies()[i() - 1];
              const showHeader = () => {
                if (!prev()) return true;
                if (prev().user !== msg.user) return true;
                const diff = parseFloat(msg.ts) - parseFloat(prev().ts);
                return diff > 180;
              };

              return (
                <>
                  <MessageItem
                    message={msg}
                    profile={profiles()[msg.user]}
                    showUser={showHeader()}
                    workspaceID={props.teamID}
                    showThreadButton={false}
                  />
                  <Show when={i() === 0 && replies().length > 1}>
                    <div class={threadStyles.replyDivider}>
                      <span class={threadStyles.replyCount}>
                        {props.parentMessage.reply_count || 0 - 1}{" "}
                        {props.parentMessage.reply_count || 0 - 1 === 1
                          ? "reply"
                          : "replies"}
                      </span>
                      <div class={threadStyles.dividerLine} />
                    </div>
                  </Show>
                </>
              );
            }}
          </For>

          <Show when={fetchingOlder()}>
            <div class={styles.loading}>Loading more...</div>
          </Show>
        </div>
        <Scrollbar container={containerRef} />
      </div>
    </div>
  );
}
