import { MdRoundChat, MdRoundDelete } from "solid-icons/md";
import { Message } from "../../bindings/fastslack/shared";
import { DeleteMessage } from "../../bindings/fastslack/slackservice";
import { useAuth } from "../AuthContext";
import Actions, { Action } from "./Actions";
import {
  addMessages,
  chatStore,
  createTombstone,
  removeMessage,
  updateMessageContent,
} from "../stores/ChatStore";

export default function MessageActions(props: {
  message: Message;
  channelID: string;
  canOpenThread: boolean;
  canDelete: boolean;
  handleThreadClick: (message: Message) => void;
}) {
  const { message } = props;
  const { workspace } = useAuth();

  async function handleDeleteClick() {
    // optimistic remove the message from UI
    // if it's a thread parent message, we should make a tombstone
    const previousMessage = props.message;
    const isRoot =
      !!props.message.ts &&
      (!props.message.thread_ts ||
        props.message.thread_ts === props.message.ts);

    if (isRoot) {
      // check if it has children
      const children =
        chatStore.channels[props.channelID]?.threadMessageIds[
          props.message.ts
        ] ?? [];
      if (children.length > 0) {
        // make tombstone
        updateMessageContent(
          props.channelID,
          props.message.ts,
          createTombstone(props.message),
        );
      } else {
        // just remove it
        removeMessage(props.channelID, props.message.ts);
      }
    } else {
      removeMessage(props.channelID, props.message.ts);
    }

    await DeleteMessage(
      workspace()!,
      props.channelID,
      message.thread_ts || "",
      message.ts,
    ).catch((err) => {
      console.error("Failed to delete message", err);
      // revert the optimistic update
      addMessages(props.channelID, [previousMessage]);
    });
  }

  const openThreadAction: Action = {
    icon: <MdRoundChat size={20} />,
    text: "Open thread",
    onClick: () => {
      props.handleThreadClick(message);
    },
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
