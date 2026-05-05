import { Virtualizer, VirtualizerHandle } from "virtua/solid";
import MessageItem from "./MessageItem";
import { chatStore } from "../stores/ChatStore";
import { Message } from "../../bindings/fastslack/shared";
import Scrollbar from "./misc/Scrollbar";
import styles from "./MessageStream.module.css";
import { createEffect, on, Show } from "solid-js";

const GROUP_WINDOW_MS = 2 * 60 * 1000;

export default function MessageStream(props: {
  direction: "up" | "down";
  channelID: string;
  threadID: string | null;
  onThreadClick: (m: Message) => void;
}) {
  let containerRef!: HTMLDivElement;
  let virtuaRef: VirtualizerHandle | undefined;

  function shouldGroupWithPrev(
    prev: Message | undefined,
    cur: Message | undefined,
  ) {
    if (!prev || !cur) return false;
    if (!prev.user || !cur.user) return false;
    if (prev.user !== cur.user) return false;

    const prevTs = Number(prev.ts) * 1000;
    const curTs = Number(cur.ts) * 1000;
    if (!Number.isFinite(prevTs) || !Number.isFinite(curTs)) return false;

    if (curTs - prevTs > GROUP_WINDOW_MS) return false;

    return true;
  }

  const ids = () => {
    const channel = chatStore.channels[props.channelID];
    if (!channel) return [];
    if (props.threadID) {
      return (channel.threadMessageIds[props.threadID] || []).filter(
        (id) => id !== props.threadID,
      );
    }
    return channel.channelMessageIds || [];
  };

  const items = () => {
    const arr = ids();
    return arr.map((id, index) => ({ id, index }));
  };

  createEffect(
    on(
      () => ids(),
      (currentIds, prevIds) => {
        const isFirstLoad = !prevIds || prevIds.length === 0;
        if (isFirstLoad && currentIds.length > 0) {
          queueMicrotask(() => {
            virtuaRef?.scrollToIndex(currentIds.length - 1, { align: "end" });
          });
        }
      },
    ),
  );

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div
        ref={containerRef}
        style={{
          height: "100%",
          overflow: "auto",
          "scrollbar-width": "none",
          "-ms-overflow-style": "none",
          display: "flex",
          "flex-direction": "column",
        }}
        class={styles.listContainer}
      >
        <Show when={props.direction === "down"}>
          <div style={{ "flex-grow": 1 }} />
        </Show>

        <Virtualizer
          data={items()}
          shift={props.direction === "up"}
          ref={(v) => (virtuaRef = v)}
        >
          {(item) => {
            const channel = chatStore.channels[props.channelID];
            const cur = channel.messages[item.id];

            const prevId = item.index > 0 ? items()[item.index - 1].id : null;
            const prev = prevId ? channel.messages[prevId] : undefined;

            const grouped = shouldGroupWithPrev(prev, cur);
            const groupStart = !grouped;

            return (
              <MessageItem
                channelID={props.channelID}
                message={cur}
                onThreadClick={props.onThreadClick}
                inThread={!!props.threadID}
                showUser={groupStart}
              />
            );
          }}
        </Virtualizer>
      </div>

      <Scrollbar container={containerRef} trackRight={2} />
    </div>
  );
}
