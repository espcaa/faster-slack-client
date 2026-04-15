import { createSignal } from "solid-js";
import { SendMessage } from "../../bindings/fastslack/slackservice";
import styles from "./ChatInput.module.css";

export default function ChatInput(props: {
  teamID: string;
  channelID: string;
  threadTS?: string;
}) {
  const [text, setText] = createSignal("");

  const send = async () => {
    const val = text().trim();
    if (!val) return;

    const blocks = JSON.stringify([
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [{ type: "text", text: val }],
          },
        ],
      },
    ]);

    try {
      await SendMessage(
        props.teamID,
        props.channelID,
        blocks,
        props.threadTS ?? "",
      );
      setText("");
    } catch (e) {
      console.error("Failed to send message", e);
    }
  };

  return (
    <div class={styles.container}>
      <input
        type="text"
        value={text()}
        onInput={(e) => setText(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Type a message..."
        class={styles.input}
      />
    </div>
  );
}
