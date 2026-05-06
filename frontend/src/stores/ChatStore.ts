import { createStore, produce } from "solid-js/store";
import {
  AppProfile,
  Message,
  UserProfile,
} from "../../bindings/fastslack/shared";
import {
  GetLatestMessages,
  GetLatestThreadReplies,
  GetMessagesAfter,
  GetMessagesBefore,
  GetThreadRepliesAfter,
  GetThreadRepliesBefore,
  ResolveBots,
  ResolveUsers,
} from "../../bindings/fastslack/slackservice";
import { createSignal } from "solid-js";

// setup things
const fetchingBots = new Set<string>();
const fetchingUsers = new Set<string>();

interface ChatState {
  channels: Record<
    string,
    {
      messages: Record<string, Message>; // ts -> message
      threads: Record<string, Record<string, Message>>; // threadTS -> ts -> message
      channelMessageIds: string[]; // sorted ts[]
      threadMessageIds: Record<string, string[]>; // thread_ts → sorted ts[]
      threadIdsByParent: Record<string, string[]>; // parent_ts -> thread_ts[]
    }
  >;
  profiles: Record<string, UserProfile>;
  bots: Record<string, AppProfile>;
  currentChannelId?: string;
  currentThreadId?: string;
}

export const [chatStore, setChatStore] = createStore<ChatState>({
  channels: {},
  profiles: {},
  bots: {},
});

export const scrollPositions = new Map<string, number>();

export const ensureChannel = (channelId: string) => {
  if (!chatStore.channels[channelId]) {
    setChatStore("channels", channelId, {
      messages: {},
      threads: {},
      channelMessageIds: [],
      threadMessageIds: {},
      threadIdsByParent: {},
    });
  }
};

// bot info
export const ensureBotInfo = async (workspaceId: string, botId: string) => {
  // return if it's being fetched or is alr in the store
  if (botId in chatStore.bots || fetchingBots.has(botId)) {
    return;
  }

  fetchingBots.add(botId);

  try {
    const info = await ResolveBots(workspaceId, [botId]);
    if (info && info[botId]) {
      setChatStore("bots", botId, info[botId]);
    }
  } finally {
    fetchingBots.delete(botId);
  }
};

let userQueue: string[] = [];
let batchTimeout: ReturnType<typeof setTimeout> | null = null;

// user batch
const processUserQueue = async (workspaceId: string) => {
  const idsToFetch = [...new Set(userQueue)];
  userQueue = [];
  batchTimeout = null;

  try {
    const info = await ResolveUsers(workspaceId, idsToFetch);
    if (info) {
      setChatStore("profiles", (prev) => ({ ...prev, ...info }));
    }
  } catch (e) {
    console.error("Failed to batch fetch users", e);
  } finally {
    idsToFetch.forEach((id) => fetchingUsers.delete(id));
  }
};

export const ensureUserInfo = (workspaceId: string, userId: string) => {
  if (chatStore.profiles[userId] || fetchingUsers.has(userId)) return;

  fetchingUsers.add(userId);
  userQueue.push(userId);

  if (batchTimeout) clearTimeout(batchTimeout);
  batchTimeout = setTimeout(() => processUserQueue(workspaceId), 50);
};

// Strip back-references and class identity so Solid's store doesn't try to
// proxy a graph that may contain cycles (root / parent_message /
// previous_message / replies all point at sibling Message instances coming
// from the bindings).
const toPlainMessage = (msg: Message): Message => {
  const plain: any = { ...msg };
  delete plain.root;
  delete plain.parent_message;
  delete plain.previous_message;
  delete plain.replies;
  return plain as Message;
};

const insertSorted = (arr: string[], value: string) => {
  const index = arr.findIndex((id) => id > value);
  if (index === -1) return [...arr, value];
  return [...arr.slice(0, index), value, ...arr.slice(index)];
};

// message handling
export const addMessages = (channelId: string, messages: Message[]) => {
  ensureChannel(channelId);
  if (messages.length === 0) return;

  // Batch every per-message mutation into a single store update so we don't
  // fire ~4×N reactive updates (and avoid re-walking the message graph for
  // each of them).
  setChatStore(
    "channels",
    channelId,
    produce((channel) => {
      for (const raw of messages) {
        const ts = raw.ts;
        const threadTs = raw.thread_ts;
        const msg = toPlainMessage(raw);

        channel.messages[ts] = msg;

        if (
          !threadTs ||
          threadTs === ts ||
          msg.subtype === "thread_broadcast"
        ) {
          if (!channel.channelMessageIds.includes(ts)) {
            channel.channelMessageIds = insertSorted(
              channel.channelMessageIds,
              ts,
            );
          }
        }

        if (threadTs) {
          if (!channel.threadMessageIds[threadTs]) {
            channel.threadMessageIds[threadTs] = [];

            const parentList = channel.threadIdsByParent[threadTs];
            channel.threadIdsByParent[threadTs] = parentList
              ? [...new Set([...parentList, ts])]
              : [ts];
          }

          const ids = channel.threadMessageIds[threadTs];
          if (!ids.includes(ts)) {
            channel.threadMessageIds[threadTs] = [...ids, ts].sort();
          }
        }
      }
    }),
  );
};

export const removeMessage = (channelId: string, ts: string) => {
  const channel = chatStore.channels[channelId];
  if (!channel) return;

  const message = channel.messages[ts];
  if (!message) return;

  const threadTs = message.thread_ts;

  setChatStore("channels", channelId, "messages", ts, undefined!);

  setChatStore("channels", channelId, "channelMessageIds", (ids) => {
    return ids.filter((id) => id !== ts);
  });

  if (threadTs) {
    setChatStore("channels", channelId, "threadMessageIds", threadTs, (ids) =>
      ids ? ids.filter((id) => id !== ts) : [],
    );

    if (channel.threadIdsByParent[ts]) {
      setChatStore("channels", channelId, "threadIdsByParent", ts, undefined!);
    }
  }
};

export const setActiveChannel = (channelId: string) => {
  ensureChannel(channelId);
  setChatStore("currentChannelId", channelId);
  if (chatStore.currentThreadId) {
    setChatStore("currentThreadId", undefined);
  }
};

export const setActiveThread = (threadId: string | undefined) => {
  setChatStore("currentThreadId", threadId);
};

const [loading, setLoading] = createSignal<{ [key: string]: boolean }>({});

export const isFetching = (key: string) => !!loading()[key];

export const fetchLatestMessages = async (
  teamId: string,
  channelId: string,
) => {
  if (loading()[channelId]) return;
  setLoading({ ...loading(), [channelId]: true });

  try {
    const resp = await GetLatestMessages(teamId, channelId);
    // Drop the response if the user has navigated away from this channel.
    if (chatStore.currentChannelId !== channelId) return;
    if (resp && resp.messages) {
      addMessages(channelId, resp.messages);
    }
  } finally {
    setLoading({ ...loading(), [channelId]: false });
  }
};

export const fetchMessagesBefore = async (
  teamId: string,
  channelId: string,
) => {
  const ids = chatStore.channels[channelId]?.channelMessageIds || [];
  if (ids.length === 0 || loading()[channelId]) return;

  // The "before" timestamp is the oldest message we currently have (index 0)
  const oldestTs = ids[0];

  setLoading({ ...loading(), [channelId]: true });
  try {
    const resp = await GetMessagesBefore(teamId, channelId, oldestTs);
    if (chatStore.currentChannelId !== channelId) return;
    if (resp && resp.messages) {
      addMessages(channelId, resp.messages);
    }
  } finally {
    setLoading({ ...loading(), [channelId]: false });
  }
};

export const fetchMessagesAfter = async (teamId: string, channelId: string) => {
  const ids = chatStore.channels[channelId]?.channelMessageIds || [];
  if (ids.length === 0 || loading()[channelId]) return;

  // The "after" timestamp is the newest message we currently have (last index)
  const newestTs = ids[ids.length - 1];

  setLoading({ ...loading(), [channelId]: true });
  try {
    const resp = await GetMessagesAfter(teamId, channelId, newestTs);
    if (chatStore.currentChannelId !== channelId) return;
    if (resp && resp.messages) {
      addMessages(channelId, resp.messages);
    }
  } finally {
    setLoading({ ...loading(), [channelId]: false });
  }
};

export const fetchLatestThreadReplies = async (
  teamId: string,
  channelId: string,
  threadTs: string,
) => {
  if (loading()[threadTs]) return;
  setLoading({ ...loading(), [threadTs]: true });

  try {
    const resp = await GetLatestThreadReplies(teamId, channelId, threadTs);
    // Drop the response if the user has navigated away from this thread.
    if (chatStore.currentThreadId !== threadTs) return;
    if (resp && resp.messages) {
      addMessages(channelId, resp.messages);
    }
  } finally {
    setLoading({ ...loading(), [threadTs]: false });
  }
};

export function fetchThreadMessagesBefore(
  teamId: string,
  channelId: string,
  threadTs: string,
  beforeTs: string,
) {
  if (loading()[threadTs]) return;
  setLoading({ ...loading(), [threadTs]: true });

  return GetThreadRepliesBefore(teamId, channelId, beforeTs, threadTs)
    .then((resp) => {
      if (chatStore.currentThreadId !== threadTs) return;
      if (resp && resp.messages) {
        addMessages(channelId, resp.messages);
      }
    })
    .finally(() => {
      setLoading({ ...loading(), [threadTs]: false });
    });
}

export function fetchThreadMessagesAfter(
  teamId: string,
  channelId: string,
  threadTs: string,
  afterTs: string,
) {
  if (loading()[threadTs]) return;
  setLoading({ ...loading(), [threadTs]: true });

  return GetThreadRepliesAfter(teamId, channelId, afterTs, threadTs)
    .then((resp) => {
      if (chatStore.currentThreadId !== threadTs) return;
      if (resp && resp.messages) {
        addMessages(channelId, resp.messages);
      }
    })
    .finally(() => {
      setLoading({ ...loading(), [threadTs]: false });
    });
}

export const reconcileOptimisticMessage = (
  channelId: string,
  tempTs: string,
  finalMessage: Message,
) => {
  const channel = chatStore.channels[channelId];
  if (!channel || !channel.messages[tempTs]) return;

  const finalTs = finalMessage.ts;
  const threadTs = finalMessage.thread_ts;

  setChatStore("channels", channelId, "messages", (msgs) => {
    const newMsgs = { ...msgs };
    delete newMsgs[tempTs];
    newMsgs[finalTs] = toPlainMessage(finalMessage);
    return newMsgs;
  });

  setChatStore("channels", channelId, "channelMessageIds", (ids) =>
    ids.includes(finalTs)
      ? ids.filter((id) => id !== tempTs)
      : ids.map((id) => (id === tempTs ? finalTs : id)),
  );

  if (threadTs) {
    setChatStore("channels", channelId, "threadMessageIds", threadTs, (ids) => {
      if (!ids) return [];
      return ids.includes(finalTs)
        ? ids.filter((id) => id !== tempTs)
        : ids.map((id) => (id === tempTs ? finalTs : id));
    });
  }
};

export const updateMessageContent = (
  channelId: string,
  ts: string,
  updatedFields: Partial<Message>,
) => {
  const channel = chatStore.channels[channelId];
  if (!channel || !channel.messages[ts]) return;

  setChatStore("channels", channelId, "messages", ts, (prev) => ({
    ...prev,
    ...updatedFields,
  }));
};

export const createTombstone = (oldMsg: Message): Message => {
  return new Message({
    ts: oldMsg.ts,
    thread_ts: oldMsg.thread_ts,
    type: "message",
    subtype: "tombstone",

    text: "This message was deleted.",
    user: "USLACKBOT",

    reply_count: oldMsg.reply_count,
    reply_users: oldMsg.reply_users,
    latest_reply: oldMsg.latest_reply,

    blocks: [],
    files: [],
  });
};
