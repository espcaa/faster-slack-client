import { MdRoundChat, MdRoundDelete } from "solid-icons/md";
import { chatStore, setChatStore } from "../ChatStore";
import { Message } from "../../bindings/fastslack/shared";
import { DeleteMessage } from "../../bindings/fastslack/slackservice";
import { useAuth } from "../AuthContext";
import Actions, { Action } from "./Actions";

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

  const openThreadAction: Action = {
    icon: <MdRoundChat size={20} />,
    text: "Open thread",
    onClick: handleThreadClick,
  };

  const deleteMessageAction: Action = {
    icon: <MdRoundDelete size={20} />,
    text: "Delete message",
    onClick: handleDeleteClick,
  };

  return (
    <Actions
      actions={[
        ...(props.canOpenThread ? [openThreadAction] : []),
        ...(props.canDelete ? [deleteMessageAction] : []),
      ]}
    />
  );
}
