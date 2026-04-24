import {
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  Show,
  createResource,
} from "solid-js";
import {
  ResolveUsers,
  SendMessage,
  SendTyping,
} from "../../bindings/fastslack/slackservice";
import styles from "./ChatInput.module.css";
import { Events } from "@wailsio/runtime";
import { useAuth } from "../AuthContext";
import { Message } from "../../bindings/fastslack/shared";
import { setChatStore } from "../ChatStore";

export default function ChatInput(props: {
  teamID: string;
  channelID: string;
  threadTS?: string;
}) {
  const [text, setText] = createSignal("");
  const [typingUsers, setTypingUsers] = createSignal(new Map<string, number>());
  const { workspace, session } = useAuth();

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
    SendTyping(props.teamID, props.channelID, props.threadTS ?? "");
  };

  const send = () => {
    const val = text().trim();
    if (!val) return;

    const blocksArray = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [{ type: "text", text: val }],
          },
        ],
      },
    ];
    const blocks = JSON.stringify(blocksArray);

    // we are optimistic here
    const tempTS = `${Date.now() / 1000}.pending`;
    const userID = session()?.workspaces[props.teamID]?.user_id ?? "";
    const optimisticMessage = new Message({
      user: userID,
      text: val,
      ts: tempTS,
      blocks: blocksArray as any,
      type: "message",
      thread_ts: props.threadTS,
    });

    if (props.threadTS) {
      const tts = props.threadTS;
      setChatStore("threadReplies", tts, (prev) => [
        ...(prev || []),
        optimisticMessage,
      ]);
    } else {
      setChatStore("messages", (prev) => [optimisticMessage, ...prev]);
    }

    const previousText = val;
    setText("");
    if (inputRef) inputRef.value = "";

    SendMessage(
      props.teamID,
      props.channelID,
      blocks,
      props.threadTS ?? "",
    ).catch((e) => {
      console.error("Failed to send message", e);
      if (props.threadTS) {
        const tts = props.threadTS;
        setChatStore("threadReplies", tts, (prev) =>
          (prev || []).filter((m) => m.ts !== tempTS),
        );
      } else {
        setChatStore("messages", (prev) => prev.filter((m) => m.ts !== tempTS));
      }
      setText(previousText);
      if (inputRef) inputRef.value = previousText;
      alert("Message failed to send. Please try again.");
    });
  };

  const [typingText] = createResource(
    () => ({ ws: workspace(), users: Array.from(typingUsers().keys()) }),
    async ({ ws, users }) => {
      if (users.length === 0) return null;

      const userProfiles = await ResolveUsers(ws || "", users);
      const displayNames = userProfiles
        .map(
          (u) =>
            u.profile.display_name || u.profile.real_name || "Unknown User",
        )
        .join(", ");

      const count = users.length;
      const suffix = count > 3 ? "and others are" : count === 1 ? "is" : "are";
      return `${displayNames} ${suffix} typing...`;
    },
  );

  onMount(() => {
    const timers = new Map<string, number>();

    const offTyping = Events.On("slack:user_typing", (event: any) => {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      if (data.channel !== props.channelID) return;
      if ((data.thread_ts ?? "") !== (props.threadTS ?? "")) return;
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
          <Show fallback={"⠀"} when={typingUsers().size > 0}>
            {typingText()}
          </Show>
        </p>
      </div>
    </div>
  );
}
