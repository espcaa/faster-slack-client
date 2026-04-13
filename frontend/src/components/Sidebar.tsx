import { createResource, createSignal, For, Show } from "solid-js";
import {
  GetChannels,
  GetIMs,
  ResolveUsers,
} from "../../bindings/fastslack/slackservice";
import { Logout } from "../../bindings/fastslack/slackauthservice";
import { chatStore, setChatStore } from "../ChatStore";
import Scrollbar from "./misc/Scrollbar";
import styles from "./Sidebar.module.css";
import { GetAvatarUrl } from "../utils/pfp";
import { MdRoundLock } from "solid-icons/md";

interface Props {
  teamID: string;
  onSelectChannel: (id: string) => void;
  selectedChannel?: string | null;
}

export default function Sidebar(props: Props) {
  const [channels] = createResource(
    () => props.teamID,
    (teamID) => GetChannels(teamID),
  );
  const [ims] = createResource(
    () => props.teamID,
    (teamID) => GetIMs(teamID),
  );
  const [scrollEl, setScrollEl] = createSignal<HTMLDivElement | null>(null);

  const [profiles] = createResource(
    () => ims(),
    async (currentIms) => {
      const userIDs = currentIms.map((im) => im.user);
      if (userIDs.length === 0) return {};

      try {
        const userList = await ResolveUsers(props.teamID, userIDs);

        const profileMap: Record<string, any> = {};
        userList.forEach((u) => {
          profileMap[u.id] = u;
        });

        return profileMap;
      } catch (e) {
        console.error("Batch resolution failed", e);
        return {};
      }
    },
  );

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
              <div
                class={styles.item}
                classList={{
                  [styles.active]: props.selectedChannel === ch.id,
                }}
                onClick={() => selectChannel(ch.id)}
              >
                <Show when={ch.is_private}>
                  <span class={styles.lock} title="Private channel">
                    <MdRoundLock size={14} />
                  </span>
                </Show>
                <Show when={ch.is_private === false}>
                  <span class={styles.hash}>#</span>
                </Show>
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
                onClick={() => selectChannel(im.id)}
                classList={{ [styles.active]: props.selectedChannel === im.id }}
              >
                <Show when={profiles()} fallback={im.user}>
                  {(data) => {
                    const user = data()[im.user];
                    return (
                      <div class={styles.dmItem}>
                        <Show when={user}>
                          {(u) => (
                            <img
                              src={GetAvatarUrl(u(), props.teamID)}
                              alt={`${u().profile?.display_name || u().profile?.real_name || im.user}'s profile picture`}
                              class={styles.avatar}
                            />
                          )}
                        </Show>
                        <span>
                          {user?.profile?.display_name ||
                            user?.profile?.real_name ||
                            im.user}
                        </span>
                      </div>
                    );
                  }}
                </Show>
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
