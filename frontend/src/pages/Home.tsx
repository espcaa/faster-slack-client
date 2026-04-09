import { createResource, createSignal, For, Show } from "solid-js";
import { useAuth } from "../AuthContext";
import { GetChannels, GetIMs } from "../../bindings/fastslack/slackservice";
import styles from "./Home.module.css";
import { Logout } from "../../bindings/fastslack/slackauthservice";
import MessageList from "../components/MessageList";
import { chatStore } from "../ChatStore";
import ThreadView from "../components/ThreadView";

export default function Home() {
  const { workspace } = useAuth();

  const [channels] = createResource(workspace, (teamID) => GetChannels(teamID));
  const [ims] = createResource(workspace, (teamID) => GetIMs(teamID));
  const [selectedChannel, setSelectedChannel] = createSignal<string | null>(
    null,
  );

  const sortedChannels = () =>
    (channels() ?? [])
      .filter((c) => !c.is_archived)
      .sort((a, b) => a.name.localeCompare(b.name));

  const sortedIMs = () =>
    (ims() ?? [])
      .filter((im) => !im.is_archived)
      .sort((a, b) => a.user.localeCompare(b.user));

  const handleLogout = () => {
    Logout();
  };

  return (
    <div class={styles.layout}>
      <div class={styles.sidebar}>
        <div class={styles.sectionHeader}>Channels</div>
        <Show
          when={!channels.loading}
          fallback={<div class={styles.loading}>Loading...</div>}
        >
          <For each={sortedChannels()}>
            {(ch) => (
              <div
                class={styles.item}
                onClick={() => setSelectedChannel(ch.id)}
              >
                <span class={styles.hash}>#</span>
                {ch.name}
              </div>
            )}
          </For>
        </Show>

        <div class={styles.sectionHeader}>Direct Messages</div>
        <Show
          when={!ims.loading}
          fallback={<div class={styles.loading}>Loading...</div>}
        >
          <For each={sortedIMs()}>
            {(im) => (
              <div
                class={styles.item}
                onClick={() => setSelectedChannel(im.id)}
              >
                {im.user}
              </div>
            )}
          </For>
        </Show>

        <div class={styles.spacer} />
        <button class="btn btn--ghost" onClick={handleLogout}>
          Log out
        </button>
      </div>

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
