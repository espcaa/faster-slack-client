import { createStore } from "solid-js/store";
import { Message, UserProfile } from "../bindings/fastslack/shared";

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
}

export const [chatStore, setChatStore] = createStore<ChatState>({
  messages: [],
  nextCursor: null,
  threadTS: null,
  threadParent: null,
  openThreads: {},
  threadReplies: {},
  profiles: {},
});

export const scrollPositions = new Map<string, number>();
