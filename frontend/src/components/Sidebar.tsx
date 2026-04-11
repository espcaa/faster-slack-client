import { createResource, createSignal, For, Show } from "solid-js";
import { GetChannels, GetIMs } from "../../bindings/fastslack/slackservice";
import { Logout } from "../../bindings/fastslack/slackauthservice";
import { chatStore, setChatStore } from "../ChatStore";
import Scrollbar from "./misc/Scrollbar";
import styles from "./Sidebar.module.css";

interface Props {
  teamID: string;
  onSelectChannel: (id: string) => void;
}

export default function Sidebar(props: Props) {
  const [channels] = createResource(() => props.teamID, (teamID) => GetChannels(teamID));
  const [ims] = createResource(() => props.teamID, (teamID) => GetIMs(teamID));
  const [scrollEl, setScrollEl] = createSignal<HTMLDivElement | null>(null);

  const sortedChannels = () =>
    (channels() ?? [])
      .filter((c) => !c.is_archived)
      .sort((a, b) => a.name.localeCompare(b.name));

  const sortedIMs = () =>
    (ims() ?? [])
      .filter((im) => !im.is_archived)
      .sort((a, b) => a.user.localeCompare(b.user));

  const selectChannel = (id: string) => {
    props.onSelectChannel(id);
    if (chatStore.openThreads[id]) {
      setChatStore({ threadParent: chatStore.openThreads[id].threadParent });
    } else {
      setChatStore({ threadParent: null });
    }
  };

  return (
    <div class={styles.sidebar}>
      <div class={styles.scrollArea} ref={(el) => setScrollEl(el)}>
        <div class={styles.sectionHeader}>Channels</div>
        <Show
          when={!channels.loading}
          fallback={<div class={styles.loading}>Loading...</div>}
        >
          <For each={sortedChannels()}>
            {(ch) => (
              <div class={styles.item} onClick={() => selectChannel(ch.id)}>
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
              <div class={styles.item} onClick={() => selectChannel(im.id)}>
                {im.user}
              </div>
            )}
          </For>
        </Show>
      </div>

      <Scrollbar container={scrollEl()} />

      <div class={styles.footer}>
        <button class="btn btn--ghost" onClick={() => Logout()}>
          Log out
        </button>
      </div>
    </div>
  );
}
