import { createStore } from "solid-js/store";
import { AppProfile, BotInfo, Message, UserProfile } from "../bindings/fastslack/shared";

interface ChatState {
  messages: Message[];
  nextCursor: string | null;
  threadTS: string | null;
  threadParent: Message | null;
  openThreads: Record<
    string,
    {
      threadTs: string;
      threadParent: Message;
    }
  >;
  threadReplies: Record<string, Message[]>;
  profiles: Record<string, UserProfile>;
  bots: Record<string, AppProfile>;
  botInfos: Record<string, BotInfo>;
}

export const [chatStore, setChatStore] = createStore<ChatState>({
  messages: [],
  nextCursor: null,
  threadTS: null,
  threadParent: null,
  openThreads: {},
  threadReplies: {},
  profiles: {},
  bots: {},
  botInfos: {},
});

export const scrollPositions = new Map<string, number>();
