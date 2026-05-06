import { For, JSX, Show } from "solid-js";
import { Message } from "../../bindings/fastslack/shared";
import MessageItem, { ThreadContext } from "./MessageItem";
import DateDivider, { isDifferentDay } from "./DateDivider";
import { chatStore } from "../ChatStore";

export default function MessageStream(props: {
  messages: Message[];
  // "up" = channel
  // "down" = thread
  direction: "up" | "down";
  channelID: string;
  workspaceID: string;
  threadContext: ThreadContext;
  onThreadClick?: (m: Message) => void;
  renderAfter?: (msg: Message, i: number) => JSX.Element;
}) {
  return (
    <For each={props.messages}>
      {(msg, i) => {
        const olderNeighbor = () =>
          props.direction === "up"
            ? props.messages[i() + 1]
            : props.messages[i() - 1];

        const authorKey = (m: typeof msg) => m.user || m.bot_id || "";

        const showHeader = () => {
          const n = olderNeighbor();
          if (!n) return true;
          if (authorKey(n) !== authorKey(msg)) return true;
          const diff = Math.abs(parseFloat(msg.ts) - parseFloat(n.ts));
          return diff > 180;
        };

        const showDateDivider = () => {
          const n = olderNeighbor();
          if (!n) return false;
          // thread view: always show divider for the first message.
          if (props.direction === "down" && i() <= 1) return false;
          return isDifferentDay(n.ts, msg.ts);
        };

        return (
          <>
            <Show when={props.direction === "down" && showDateDivider()}>
              <DateDivider ts={msg.ts} />
            </Show>
            <MessageItem
              channelID={props.channelID}
              message={msg}
              profile={chatStore.profiles[msg.user]}
              showUser={showHeader()}
              workspaceID={props.workspaceID}
              threadContext={props.threadContext}
              onThreadClick={props.onThreadClick}
            />
            {props.renderAfter?.(msg, i())}
            <Show when={props.direction === "up" && showDateDivider()}>
              <DateDivider ts={msg.ts} />
            </Show>
          </>
        );
      }}
    </For>
  );
}
