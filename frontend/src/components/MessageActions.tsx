import { MdRoundChat, MdRoundDelete } from "solid-icons/md";
import styles from "./MessageActions.module.css";
import { chatStore, setChatStore } from "../ChatStore";
import { Message } from "../../bindings/fastslack/shared";
import { Show } from "solid-js";
import { DeleteMessage } from "../../bindings/fastslack/slackservice";
import { useAuth } from "../AuthContext";

export default function MessageActions(props: {
  message: Message;
  channelID: string;
  canOpenThread: boolean;
  canDelete: boolean;
}) {
  const { message } = props;
  const { workspace } = useAuth();

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

  async function handleDeleteClick() {
    // optimistic remove the message from UI
    if (props.message.thread_ts) {
      setChatStore("threadReplies", props.message.thread_ts, (prev) =>
        prev ? prev.filter((m) => m.ts !== props.message.ts) : [],
      );
    } else {
      setChatStore("messages", (prev) =>
        prev ? prev.filter((m) => m.ts !== props.message.ts) : [],
      );
    }

    const previousMessage = props.message;

    await DeleteMessage(
      workspace()!,
      props.channelID,
      message.thread_ts || "",
      message.ts,
    ).catch((err) => {
      console.error("Failed to delete message", err);
      // revert the optimistic update
      if (props.message.thread_ts) {
        setChatStore("threadReplies", props.message.thread_ts, (prev) =>
          prev ? [...prev, previousMessage] : [previousMessage],
        );
      } else {
        setChatStore("messages", (prev) =>
          prev ? [...prev, previousMessage] : [previousMessage],
        );
      }
    });
  }

  return (
    <Show when={props.canOpenThread || props.canDelete}>
      <div class={styles.container}>
        <Show when={props.canOpenThread}>
          <button
            class={styles.button}
            title="Reply in thread"
            onClick={handleThreadClick}
          >
            <MdRoundChat size={20} />
          </button>{" "}
        </Show>

        <Show when={props.canDelete}>
          <button
            class={styles.button}
            title="Delete message"
            onClick={handleDeleteClick}
          >
            <MdRoundDelete size={20} />
          </button>
        </Show>
      </div>
    </Show>
  );
}
