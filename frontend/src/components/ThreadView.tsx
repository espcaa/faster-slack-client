import {
  createEffect,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import styles from "./MessageList.module.css";
import threadStyles from "./ThreadView.module.css";
import Scrollbar from "./misc/Scrollbar";
import { Message, UserProfile } from "../../bindings/fastslack/shared";
import {
  GetThreadMessages,
  ResolveUsers,
} from "../../bindings/fastslack/slackservice";
import { Events } from "@wailsio/runtime";
import MessageItem from "./MessageItem";
import DateDivider, { isDifferentDay } from "./DateDivider";
import { setChatStore } from "../ChatStore";
import ChatInput from "./ChatInput";

const threadScrollPositions = new Map<string, number>();

export default function ThreadView(props: {
  teamID: string;
  channelID: string;
  parentMessage: Message;
}) {
  let containerRef!: HTMLDivElement;
  const [loading, setLoading] = createSignal(false);
  const [fetchingOlder, setFetchingOlder] = createSignal(false);
  const [replies, setReplies] = createSignal<Message[]>([]);
  const [nextCursor, setNextCursor] = createSignal<string | null>(null);
  const [profiles, setProfiles] = createSignal<Record<string, UserProfile>>({});

  const threadTS = () => props.parentMessage.ts;

  const fetchProfiles = async (msgs: Message[]) => {
    const userIDs = [...new Set(msgs.map((m) => m.user).filter(Boolean))];
    if (!userIDs.length) return;
    const resolved = await ResolveUsers(props.teamID, userIDs);
    const profileMap: Record<string, UserProfile> = {};
    for (const p of resolved) profileMap[p.id] = p;
    setProfiles((prev) => ({ ...prev, ...profileMap }));
  };

  const dedupe = (msgs: Message[]): Message[] => {
    const seen = new Set<string>();
    return msgs.filter((m) => {
      if (seen.has(m.ts)) return false;
      seen.add(m.ts);
      return true;
    });
  };

  const loadReplies = async () => {
    setLoading(true);
    setReplies([]);
    setNextCursor(null);

    // fetch first page (may come from cache)
    const first = await GetThreadMessages(
      props.teamID,
      props.channelID,
      threadTS(),
      "",
    );
    let msgs = first?.messages || [];
    let cursor = first?.next_cursor || "";

    // if cache was used, refresh from the API
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

    setReplies(dedupe(msgs));
    setNextCursor(cursor || null);
    fetchProfiles(msgs);
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
        fetchProfiles(page.messages);
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

    const nearBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
    if (nearBottom && !fetchingOlder()) {
      loadOlderReplies();
    }
  };

  onMount(() => {
    const offMessage = Events.On("slack:message", (event: any) => {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      if (data.channel !== props.channelID || data.thread_ts !== threadTS())
        return;

      const msg = data as Message;
      setReplies((prev) => {
        if (prev.some((m) => m.ts === msg.ts)) return prev;
        return [...prev, msg];
      });
      fetchProfiles([msg]);
    });

    const offChanged = Events.On("slack:message_changed", (event: any) => {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      if (data.channel !== props.channelID) return;

      const updated = data.message as Message;
      if (updated.thread_ts !== threadTS() && updated.ts !== threadTS()) return;

      setReplies((prev) =>
        prev.map((m) => (m.ts === updated.ts ? updated : m)),
      );
    });

    const offDeleted = Events.On("slack:message_deleted", (event: any) => {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      if (data.channel !== props.channelID || data.thread_ts !== threadTS())
        return;

      setReplies((prev) => prev.filter((m) => m.ts !== data.deleted_ts));
    });

    onCleanup(() => {
      offMessage();
      offChanged();
      offDeleted();
    });
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
              const showDateDivider = () => {
                if (i() <= 1) return false;
                if (!prev()) return false;
                return isDifferentDay(prev().ts, msg.ts);
              };

              return (
                <>
                  <Show when={showDateDivider()}>
                    <DateDivider ts={msg.ts} />
                  </Show>
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
                        {(props.parentMessage.reply_count || 0) - 1}{" "}
                        {(props.parentMessage.reply_count || 0) - 1 === 1
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
            <div class={styles.loading}>Loading more replies...</div>
          </Show>
          <ChatInput teamID={props.teamID} channelID={props.channelID} threadTS={threadTS()} />
        </div>
        <Scrollbar container={containerRef} />
      </div>
    </div>
  );
}
