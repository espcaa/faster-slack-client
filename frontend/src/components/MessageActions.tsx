import { MdRoundChat, MdRoundDelete } from "solid-icons/md";
import { Message } from "../../bindings/fastslack/shared";
import { DeleteMessage } from "../../bindings/fastslack/slackservice";
import { useAuth } from "../AuthContext";
import Actions, { Action } from "./Actions";

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
    if (props.message.thread_ts) {
    } else {
    }

    const previousMessage = props.message;
    previousMessage;

    await DeleteMessage(
      workspace()!,
      props.channelID,
      message.thread_ts || "",
      message.ts,
    ).catch((err) => {
      console.error("Failed to delete message", err);
      // revert the optimistic update
      if (props.message.thread_ts) {
      } else {
      }
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
