import { createMemo, createSignal, onMount, Show } from "solid-js";
import styles from "./BotProfileCard.module.css";
import { chatStore, setChatStore } from "../ChatStore";
import { ResolveBots } from "../../bindings/fastslack/slackservice";
import Popover from "./misc/PopoverTrigger";

export type InlineBotProfile = {
  id?: string;
  app_id?: string;
  name?: string;
  icons?: {
    image_36?: string;
    image_48?: string;
    image_72?: string;
  };
};

export default function BotProfileCard(props: {
  workspaceID: string;
  inline?: InlineBotProfile;
  fallbackName?: string;
}) {
  const appID = () => props.inline?.app_id;
  const cached = createMemo(() => {
    const id = appID();
    return id ? chatStore.bots[id] : undefined;
  });

  const [fetched, setFetched] = createSignal(false);

  onMount(async () => {
    const id = appID();
    if (!id) {
      setFetched(true);
      return;
    }
    if (chatStore.bots[id]) {
      setFetched(true);
      return;
    }
    try {
      const bots = await ResolveBots(props.workspaceID, [id]);
      const map: Record<string, any> = {};
      for (const b of bots) map[b.id] = b;
      setChatStore("bots", (prev) => ({ ...prev, ...map }));
    } catch (e) {
      console.warn("ResolveBots failed", e);
    } finally {
      setFetched(true);
    }
  });

  const avatar = () =>
    cached()?.auth?.icons?.image_192 ||
    cached()?.icons?.image_192 ||
    cached()?.icons?.image_72 ||
    props.inline?.icons?.image_72 ||
    props.inline?.icons?.image_48 ||
    "";

  const displayName = () =>
    cached()?.auth?.real_name ||
    cached()?.name ||
    props.inline?.name ||
    props.fallbackName ||
    "App";

  return (
    <div class={styles.card}>
      <div class={styles.header}>
        <Show when={avatar()}>
          <img src={avatar()} class={styles.avatar} alt="" />
        </Show>
        <div class={styles.headerInfo}>
          <div class={styles.nameRow}>
            <span class={styles.name}>{displayName()}</span>
            <span class={styles.appBadge}>App</span>
            <Show when={cached()?.is_certified}>
              <span class={styles.certifiedBadge}>Certified</span>
            </Show>
          </div>
          <Show when={cached()?.developer_name}>
            <div class={styles.developer}>By {cached()!.developer_name}</div>
          </Show>
        </div>
      </div>

      <Show when={!cached() && !fetched()}>
        <div class={styles.loading}>Loading app info…</div>
      </Show>

      <Show when={cached()?.desc}>
        <div class={styles.divider} />
        <div class={styles.section}>
          <div class={styles.sectionTitle}>About</div>
          <div class={styles.desc}>{cached()!.desc}</div>
        </div>
      </Show>

      <Show when={cached()?.url || cached()?.support_url}>
        <div class={styles.divider} />
        <div class={styles.linkRow}>
          <Show when={cached()?.url}>
            <a
              class={styles.link}
              href={cached()!.url}
              target="_blank"
              rel="noreferrer"
            >
              App page
            </a>
          </Show>
          <Show when={cached()?.support_url}>
            <a
              class={styles.link}
              href={cached()!.support_url}
              target="_blank"
              rel="noreferrer"
            >
              Support
            </a>
          </Show>
        </div>
      </Show>
    </div>
  );
}

export const BotProfileCardTrigger = (props: {
  workspaceID: string;
  inline?: InlineBotProfile;
  fallbackName?: string;
  children: any;
}) => (
  <Popover
    content={
      <BotProfileCard
        workspaceID={props.workspaceID}
        inline={props.inline}
        fallbackName={props.fallbackName}
      />
    }
  >
    {props.children}
  </Popover>
);
