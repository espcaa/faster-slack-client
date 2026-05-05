import { Show } from "solid-js";
import { useAuth } from "../AuthContext";
import styles from "./Home.module.css";
import { chatStore } from "../stores/ChatStore";
import Sidebar from "../components/Sidebar";
import SearchBar from "../components/Searchbar";
import SettingsOverlay from "../components/SettingsOverlay";
import ChannelView from "../components/ChannelView";

export default function Home() {
  const { workspace } = useAuth();

  return (
    <div class={styles.layout}>
      <SearchBar />
      <Sidebar teamID={workspace()!} />

      <div class={styles.main}>
        <Show when={chatStore.currentChannelId}>
          <ChannelView channelID={chatStore.currentChannelId!} />
        </Show>
      </div>
      <SettingsOverlay />
    </div>
  );
}
