import { MdRoundChat } from "solid-icons/md";
import styles from "./MessageActions.module.css";
import { chatStore, setChatStore } from "../ChatStore";
import { Message } from "../../bindings/fastslack/shared";
import { Show } from "solid-js";

export default function MessageActions(props: {
  message: Message;
  channelID: string;
  canOpenThread: boolean;
}) {
  const { message } = props;

  function handleThreadClick() {
    setChatStore({
      threadTS: message.thread_ts || message.ts,
      threadParent: message,
      openThreads: {
        ...chatStore.openThreads,
        [props.channelID]: {
          threadTs: message.thread_ts || message.ts,
          threadParent: message,
        },
      },
    });
  }

  return (
    <div class={styles.container}>
      <Show when={props.canOpenThread}>
        <button
          class={styles.button}
          title="Reply in thread"
          onClick={handleThreadClick}
        >
          <MdRoundChat size={20} />
        </button>
      </Show>
    </div>
  );
}
