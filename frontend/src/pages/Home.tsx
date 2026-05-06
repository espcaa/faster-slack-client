import { Show } from "solid-js";
import { useAuth } from "../AuthContext";
import styles from "./Home.module.css";
import MessageList from "../components/MessageList";
import { chatStore } from "../ChatStore";
import ThreadView from "../components/ThreadView";
import Sidebar from "../components/Sidebar";
import SearchBar from "../components/Searchbar";
import { useNavigation } from "../NavigationContext";
import SettingsOverlay from "../components/SettingsOverlay";

export default function Home() {
  const { workspace } = useAuth();

  return (
    <div class={styles.layout}>
      <SearchBar />
      <Sidebar teamID={workspace()!} />

      <div class={styles.main}>
        <Show when={useNavigation().selectedChannel()}>
          <MessageList
            teamID={workspace()!}
            channelID={useNavigation().selectedChannel()!}
          />
        </Show>
      </div>
      <Show when={chatStore.threadParent}>
        {(parent) => (
          <ThreadView
            teamID={workspace()!}
            channelID={useNavigation().selectedChannel()!}
            parentMessage={parent()}
          />
        )}
      </Show>
      <SettingsOverlay />
    </div>
  );
}
