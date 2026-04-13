import { createSignal, Show } from "solid-js";
import { useAuth } from "../AuthContext";
import styles from "./Home.module.css";
import MessageList from "../components/MessageList";
import { chatStore } from "../ChatStore";
import ThreadView from "../components/ThreadView";
import Sidebar from "../components/Sidebar";

export default function Home() {
  const { workspace } = useAuth();

  const [selectedChannel, setSelectedChannel] = createSignal<string | null>(
    null,
  );

  return (
    <div class={styles.layout}>
      <Sidebar
        teamID={workspace()!}
        onSelectChannel={setSelectedChannel}
        selectedChannel={selectedChannel()}
      />

      <div class={styles.main}>
        <Show
          when={selectedChannel()}
          fallback={<span class={styles.placeholder}>Select a channel</span>}
        >
          <MessageList teamID={workspace()!} channelID={selectedChannel()!} />
        </Show>
      </div>
      <Show when={chatStore.threadParent}>
        {(parent) => (
          <ThreadView
            teamID={workspace()!}
            channelID={selectedChannel()!}
            parentMessage={parent()}
          />
        )}
      </Show>
    </div>
  );
}
