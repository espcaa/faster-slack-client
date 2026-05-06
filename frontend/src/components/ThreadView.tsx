import threadStyles from "./ThreadView.module.css";
import Scrollbar from "./misc/Scrollbar";
import { Message } from "../../bindings/fastslack/shared";
import ChatInput from "./ChatInput";
import MessageStream from "./MessageStream";
import MessageItem from "./MessageItem";
import { createEffect, onCleanup } from "solid-js";
import {
  chatStore,
  fetchLatestThreadReplies,
  fetchThreadMessagesAfter,
  isFetchingThread,
  setActiveThread,
} from "../stores/ChatStore";

export default function ThreadView(props: {
  teamID: string;
  channelID: string;
  parentMessage: Message;
}) {
  let containerRef!: HTMLDivElement;

  // boot the thread: ensure store + fetch latest if we have nothing
  createEffect(() => {
    const channelID = props.channelID;
    const threadTs = props.parentMessage.ts;

    console.log(`[ThreadView] createEffect triggered for thread ${threadTs}`);
    console.log(`[ThreadView] Parent message:`, props.parentMessage);

    // Set this thread as active
    setActiveThread(threadTs);

    const existing = chatStore.channels[channelID]?.threadMessageIds[threadTs];
    console.log(`[ThreadView] Existing thread messages:`, existing);
    // The parent message itself lives in threadMessageIds[threadTs], so a
    // length of 1 (or 0) means we still need to fetch the actual replies.
    const replyCount = existing
      ? existing.filter((id) => id !== threadTs).length
      : 0;
    if (replyCount === 0) {
      console.log(`[ThreadView] Fetching thread replies`);
      fetchLatestThreadReplies(props.teamID, channelID, threadTs);
    }
  });

  onCleanup(() => {
    // Clear active thread when component unmounts
    setActiveThread(undefined);
  });

  return (
    <div class={threadStyles.panel}>
      <div class={threadStyles.header}>
        <span class={threadStyles.title}>Thread</span>
        <button
          class={threadStyles.close}
          onClick={() => {
            setActiveThread(undefined);
          }}
        >
          ✕
        </button>
      </div>
      <div class={threadStyles.listWrapper}>
        <div class={threadStyles.list} ref={containerRef}>
          <MessageItem
            channelID={props.channelID}
            message={props.parentMessage}
            showUser={true}
            inThread={true}
            onThreadClick={() => {}}
          />
          <div class={threadStyles.dividerContainer}>
            <span class={threadStyles.replyCount}>
              {props.parentMessage.reply_count || 0}{" "}
              {(props.parentMessage.reply_count || 0) === 1
                ? "reply"
                : "replies"}
            </span>
            <div class={threadStyles.dividerLine} />
          </div>
          <MessageStream
            channelID={props.channelID}
            threadID={props.parentMessage.ts}
            onThreadClick={() => {}}
            direction="up"
            // renderAfter={(_msg, i) => (
            //   <Show when={i === 0 && replies().length > 1}>
            //     <div class={threadStyles.replyDivider}>
            //       <span class={threadStyles.replyCount}>
            //         {(props.parentMessage.reply_count || 0) - 1}{" "}
            //         {(props.parentMessage.reply_count || 0) - 1 === 1
            //           ? "reply"
            //           : "replies"}
            //       </span>
            //       <div class={threadStyles.dividerLine} />
            //     </div>
            //   </Show>
            // )}
            onReachBottom={() => {
              const lastTs =
                chatStore.channels[props.channelID]?.threadMessageIds[
                  props.parentMessage.ts
                ]?.slice(-1)[0];
              if (!lastTs) return;
              fetchThreadMessagesAfter(
                props.teamID,
                props.channelID,
                props.parentMessage.ts,
                lastTs,
              );
            }}
            isLoadingMore={() => isFetchingThread(props.parentMessage.ts)}
          />

          <div class={threadStyles.inputContainer}>
            <ChatInput
              teamID={props.teamID}
              channelID={props.channelID}
              threadTS={props.parentMessage.ts}
            />
          </div>
        </div>
        <Scrollbar container={containerRef} />
      </div>
    </div>
  );
}
