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
    if (!existing) {
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
            //TODO: close thread thingies
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
              fetchThreadMessagesAfter(
                props.teamID,
                props.channelID,
                props.parentMessage.ts,
                chatStore.channels[props.channelID]?.threadMessageIds[
                  props.parentMessage.ts
                ]?.slice(-1)[0],
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
