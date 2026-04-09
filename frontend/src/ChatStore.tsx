import { createStore } from "solid-js/store";
import { Message } from "../bindings/fastslack/shared";

interface ChatState {
  messages: Message[];
  nextCursor: string | null;
  threadTS: string | null;
  threadParent: Message | null;
}

export const [chatStore, setChatStore] = createStore<ChatState>({
  messages: [],
  nextCursor: null,
  threadTS: null,
  threadParent: null,
});

export const scrollPositions = new Map<string, number>();
