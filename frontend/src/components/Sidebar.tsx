import {
  createEffect,
  createResource,
  createSignal,
  For,
  Show,
  onMount,
  Switch,
  Match,
} from "solid-js";
import {
  GetAllCategories,
  GetChannels,
  GetIMs,
} from "../../bindings/fastslack/slackservice";
import { Logout } from "../../bindings/fastslack/slackauthservice";
import Scrollbar from "./misc/Scrollbar";
import styles from "./Sidebar.module.css";
import { Category, Channel } from "../../bindings/fastslack/shared";
import { Events } from "@wailsio/runtime";
import EmojiComponent from "./misc/Emoji";
import ChannelItem from "./ChannelItem";
import { MdRoundMessage, MdRoundStar, MdRoundTag } from "solid-icons/md";
import { chatStore, ensureUserInfo } from "../stores/ChatStore";

interface Props {
  teamID: string;
}

const CatBasicNames: Record<string, string> = {
  channels: "Channels",
  direct_messages: "Direct Messages",
  stars: "Starred",
  recent_apps: "Apps",
  slack_connect: "Shared",
};

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
  const [categories, setCategories] = createSignal<Category[]>([]);

  const loadCategories = async () => {
    try {
      const cats = await GetAllCategories(props.teamID);
      setCategories(cats || []);
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  };

  onMount(() => {
    loadCategories();

    Events.On("slack:categories_updated", (e) => {
      if (e.data.teamID === props.teamID) {
        setCategories(e.data.categories);
      }
    });
  });

  createEffect(() => {
    const ids = ims()
      ?.map((im) => im.user)
      .filter((id): id is string => !!id)
      .join(",");

    if (!ids) return;

    ids.split(",").forEach((id) => {
      ensureUserInfo(props.teamID, id);
    });
  });

  const grouped = () => {
    const allChannels = channels() ?? [];
    const allIMs = ims() ?? [];
    const allItems = [...allChannels, ...allIMs];
    const channelMap = new Map(allItems.map((ch) => [ch.id, ch]));

    const assignedIds = new Set(
      categories().flatMap((cat) => cat.channel_ids_page?.channel_ids || []),
    );

    return categories()
      .map((cat) => {
        let sectionChannels: Channel[] = [];

        if (cat.type === "direct_messages") {
          const unassignedIMs = allIMs.filter((im) => !assignedIds.has(im.id));
          const assignedToThis = (cat.channel_ids_page?.channel_ids || [])
            .map((id) => channelMap.get(id))
            .filter((ch): ch is Channel => !!ch);

          sectionChannels = [...assignedToThis, ...unassignedIMs];
        } else if (cat.type === "channels") {
          const unassignedChannels = allChannels.filter(
            (ch) => !assignedIds.has(ch.id),
          );
          const assignedToThis = (cat.channel_ids_page?.channel_ids || [])
            .map((id) => channelMap.get(id))
            .filter((ch): ch is Channel => !!ch);

          sectionChannels = [...assignedToThis, ...unassignedChannels];
        } else {
          sectionChannels = (cat.channel_ids_page?.channel_ids || [])
            .map((id) => channelMap.get(id))
            .filter((ch): ch is Channel => !!ch);
        }

        return {
          ...cat,
          name: CatBasicNames[cat.type] || cat.name || "Section",
          channels: sectionChannels,
        };
      })
      .filter(
        (group) =>
          group.channels.length > 0 || group.type === "direct_messages",
      );
  };

  return (
    <div class={styles.sidebar}>
      <div class={styles.sidebarContent}>
        <div class={styles.scrollArea} ref={setScrollEl}>
          <Show
            when={!channels.loading && !ims.loading}
            fallback={<div class={styles.loading}>Loading...</div>}
          >
            <For each={grouped()}>
              {(group) => (
                <div class={styles.category}>
                  <div class={styles.categoryHeader}>
                    <Switch
                      fallback={
                        <EmojiComponent
                          name={
                            group.emoji ||
                            (group.type === "stars" ? "star" : "")
                          }
                        />
                      }
                    >
                      <Match when={group.type === "direct_messages"}>
                        <div class={styles.iconCard}>
                          <MdRoundMessage size={16} />
                        </div>
                      </Match>

                      <Match when={group.type === "channels"}>
                        <div class={styles.iconCard}>
                          <MdRoundTag size={16} />
                        </div>
                      </Match>

                      <Match when={group.type === "starred"}>
                        <div class={styles.iconCard}>
                          <MdRoundStar size={16} />
                        </div>
                      </Match>
                    </Switch>

                    <p class={styles.categoryName}>
                      {group.name ||
                        (group.type === "stars" ? "Starred" : "Section")}
                    </p>
                  </div>

                  <For each={group.channels}>
                    {(ch) => (
                      <ChannelItem
                        channel={ch}
                        teamID={props.teamID}
                        userProfile={
                          ch.user ? chatStore.profiles[ch.user] : undefined
                        }
                      />
                    )}
                  </For>
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
    </div>
  );
}
