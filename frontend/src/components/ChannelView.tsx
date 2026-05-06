import { createEffect, on, Show } from "solid-js";
import styles from "./ChannelView.module.css";
import ChannelHeader from "./misc/ChannelHeader";
import { useAuth } from "../AuthContext";
import ChatInput from "./ChatInput";
import MessageStream from "./MessageStream";
import {
  chatStore,
  ensureChannel,
  fetchLatestMessages,
  fetchLatestThreadReplies,
  fetchMessagesBefore,
  isFetching,
  setActiveChannel,
  setActiveThread,
} from "../stores/ChatStore";
import ThreadView from "./ThreadView";

export default function ChannelView(props: { channelID: string }) {
  // setup
  const { workspace } = useAuth();

  // boot the channel: ensure store + fetch latest if we have nothing
  createEffect(
    on(
      () => props.channelID,
      (channelID) => {
        ensureChannel(channelID);
        setActiveChannel(channelID);
        const existing = chatStore.channels[channelID]?.channelMessageIds ?? [];
        if (existing.length === 0) {
          fetchLatestMessages(workspace()!, channelID);
        }
      },
    ),
  );

  return (
    <div class={styles.container}>
      <div class={styles.mainChat}>
        <div class={styles.header}>
          <ChannelHeader teamID={workspace()!} channelID={props.channelID} />
        </div>
        <div class={styles.listWrapper}>
          <MessageStream
            channelID={props.channelID}
            direction="down"
            threadID={null}
            onThreadClick={(m) => {
              setActiveThread(m.ts);
              fetchLatestThreadReplies(workspace()!, props.channelID, m.ts);
            }}
            onReachTop={() => {
              fetchMessagesBefore(workspace()!, props.channelID);
            }}
            isLoadingMore={() => isFetching(props.channelID)}
          />
        </div>
        <ChatInput teamID={workspace()!} channelID={props.channelID} />
      </div>
      <Show
        when={
          chatStore.currentThreadId &&
          chatStore.channels[props.channelID]?.messages[
            chatStore.currentThreadId
          ]
        }
      >
        <div class={styles.thread}>
          <ThreadView
            teamID={workspace()!}
            channelID={props.channelID}
            parentMessage={
              chatStore.channels[props.channelID]?.messages[
                chatStore.currentThreadId!
              ]!
            }
          />
        </div>
      </Show>
    </div>
  );
}
