import { createSignal, createEffect, onMount, onCleanup, Show } from "solid-js";
import { SendMessage, SendTyping } from "../../bindings/fastslack/slackservice";
import styles from "./ChatInput.module.css";
import { Events } from "@wailsio/runtime";

export default function ChatInput(props: {
  teamID: string;
  channelID: string;
  threadTS?: string;
}) {
  const [text, setText] = createSignal("");
  const [typingUsers, setTypingUsers] = createSignal(new Map<string, number>());

  createEffect(() => {
    props.channelID;
    setTypingUsers(new Map());
  });

  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    props.channelID;
    inputRef?.focus();
  });

  let lastTypingSent = 0;
  const emitTyping = () => {
    const now = Date.now();
    if (now - lastTypingSent < 3000) return;
    lastTypingSent = now;
    SendTyping(props.teamID, props.channelID);
  };

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

  onMount(() => {
    const timers = new Map<string, number>();

    const offTyping = Events.On("slack:user_typing", (event: any) => {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      if (data.channel !== props.channelID) return;
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.user, Date.now());
        return newMap;
      });

      if (timers.has(data.user)) clearTimeout(timers.get(data.user));
      timers.set(
        data.user,
        window.setTimeout(() => {
          setTypingUsers((prev) => {
            const newMap = new Map(prev);
            newMap.delete(data.user);
            return newMap;
          });
          timers.delete(data.user);
        }, 4000),
      );
    });

    onCleanup(() => {
      offTyping();
      timers.forEach((t) => clearTimeout(t));
    });
  });

  return (
    <div class={styles.container}>
      <input
        ref={inputRef}
        type="text"
        value={text()}
        onInput={(e) => {
          setText(e.currentTarget.value);
          emitTyping();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Type a message..."
        class={styles.input}
        autoCapitalize="off"
        autocorrect="off"
        autocomplete="off"
        spellcheck={true}
      />
      <div class={styles.typingIndicator}>
        <p>
          <Show when={typingUsers().size > 0}>
            {Array.from(typingUsers().keys()).slice(0, 3).join(", ")}{" "}
            {typingUsers().size > 3
              ? "and others are"
              : typingUsers().size === 1
                ? "is"
                : "are"}{" "}
            typing...
          </Show>
        </p>
      </div>
    </div>
  );
}
