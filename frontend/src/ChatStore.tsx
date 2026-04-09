import { createStore } from "solid-js/store";
import { Message } from "../bindings/fastslack/shared";

interface ChatState {
  messages: Message[];
  nextCursor: string | null;
}

export const [chatStore, setChatStore] = createStore<ChatState>({
  messages: [],
  nextCursor: null,
});

export const scrollPositions = new Map<string, number>();
