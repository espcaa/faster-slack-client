import { createStore } from "solid-js/store";
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

// message handling
export const addMessages = (channelId: string, messages: Message[]) => {
  ensureChannel(channelId);

  messages.forEach((msg) => {
    const ts = msg.ts;
    const threadTs = msg.thread_ts;

    setChatStore("channels", channelId, "messages", ts, msg);

    if (!threadTs || threadTs === ts || msg.subtype === "thread_broadcast") {
      const insertSorted = (arr: string[], value: string) => {
        const index = arr.findIndex((id) => id > value);
        if (index === -1) return [...arr, value];
        return [...arr.slice(0, index), value, ...arr.slice(index)];
      };

      setChatStore("channels", channelId, "channelMessageIds", (ids) => {
        if (ids.includes(ts)) return ids;
        return insertSorted(ids, ts);
      });
    }

    if (threadTs) {
      if (!chatStore.channels[channelId].threadMessageIds[threadTs]) {
        setChatStore("channels", channelId, "threadMessageIds", threadTs, []);

        setChatStore(
          "channels",
          channelId,
          "threadIdsByParent",
          threadTs,
          (prev) => {
            return prev ? [...new Set([...prev, ts])] : [ts];
          },
        );
      }

      setChatStore(
        "channels",
        channelId,
        "threadMessageIds",
        threadTs,
        (ids) => {
          if (ids.includes(ts)) return ids;
          return [...ids, ts].sort();
        },
      );
    }
  });
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
