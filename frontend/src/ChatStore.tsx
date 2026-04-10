import { createStore } from "solid-js/store";
import { Message } from "../bindings/fastslack/shared";

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
}

export const [chatStore, setChatStore] = createStore<ChatState>({
  messages: [],
  nextCursor: null,
  threadTS: null,
  threadParent: null,
  openThreads: {},
});

export const scrollPositions = new Map<string, number>();
