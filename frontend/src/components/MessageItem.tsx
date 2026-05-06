import { createMemo, onMount, Show } from "solid-js";
import {
  type Message,
  type UserProfile,
} from "../../bindings/fastslack/shared/models";
import styles from "./MessageItem.module.css";
import ClankerChip from "./misc/ClankerChip";
import ThreadRepliesButton from "./misc/ThreadRepliesButton";
import BlockKitRenderer from "../blockkit/BlockKitRenderer";
import { GetAvatarUrl } from "../utils/pfp";
import EditedIndicator from "./misc/EditedIndicator";
import ImageComponent from "./media/ImageComponent";
import MessageActions from "./MessageActions";
import { useAuth } from "../AuthContext";
import { UserProfileCardTrigger } from "./UserProfileCard";
import { BotProfileCardTrigger, type InlineBotProfile } from "./BotProfileCard";
import { chatStore, setChatStore } from "../ChatStore";
import { ResolveBotInfo } from "../../bindings/fastslack/slackservice";
import EmojiComponent from "./misc/Emoji";
import AttachmentCard from "./media/AttachmentCard";

export type ThreadContext = "list" | "thread";

export default function MessageItem(props: {
  message: Message;
  profile?: UserProfile;
  showUser?: boolean;
  workspaceID: string;
  onThreadClick?: (message: Message) => void;
  // "list"   = main channel view: inline replies button + actions thread button
  // "thread" = inside the thread panel: no thread buttons
  threadContext: ThreadContext;
  channelID: string;
}) {
  const { session, workspace } = useAuth();

  const userID = session()?.workspaces[workspace()!]?.user_id ?? "";

  const inList = () => props.threadContext === "list";
  const showInlineReplies = () =>
    inList() && (props.message.reply_count ?? 0) > 0;

  const isBot = () => !props.message.user && !!props.message.bot_id;

  const botInfo = createMemo(() => {
    const id = (props.message as any).bot_id as string | undefined;
    return id ? chatStore.botInfos[id] : undefined;
  });

  onMount(async () => {
    if (!isBot()) return;
    const m = props.message as any;
    const id = m.bot_id as string;
    if (m.icons && m.username) return;
    if (chatStore.botInfos[id]) return;
    try {
      const info = await ResolveBotInfo(props.workspaceID, id);
      if (info) {
        setChatStore("botInfos", (prev) => ({ ...prev, [info.id]: info }));
      }
    } catch (e) {
      console.warn("ResolveBotInfo failed", e);
    }
  });

  const botInline = (): InlineBotProfile | undefined => {
    const m = props.message as any;
    if (!m.bot_id && !m.app_id) return undefined;
    const info = botInfo();
    return {
      id: m.bot_id,
      app_id: m.app_id || info?.app_id,
      name: m.username || info?.name,
      icons: m.icons || info?.icons,
    };
  };
  const botAvatar = () => {
    const icons = (props.message as any).icons || botInfo()?.icons;
    if (icons?.emoji) {
      const clean = icons.emoji.replace(/^:|:$/g, "");
      return <EmojiComponent name={clean} fillContainer={true} />;
    } else {
      const url =
        icons?.image_192 ||
        icons?.image_72 ||
        icons?.image_48 ||
        icons?.image_36 ||
        "";
      return (
        <img
          src={url}
          alt={`${botName()}'s profile picture`}
          class={styles.avatar}
        />
      );
    }
  };
  const botName = () =>
    (props.message as any).username || botInfo()?.name || "App";
  const hasUserHeader = () => props.showUser && props.profile;
  const hasBotHeader = () => props.showUser && isBot();

  return (
    <div class={`${styles.message} ${props.showUser ? styles.groupStart : ""}`}>
      <div class={styles.left}>
        <Show when={hasUserHeader()}>
          <UserProfileCardTrigger
            profile={props.profile!}
            workspaceID={props.workspaceID}
            children={
              <img
                src={GetAvatarUrl(props.profile!, props.workspaceID)}
                alt={`${props.profile!.profile.display_name}'s profile picture`}
                class={styles.avatar}
              />
            }
          />
        </Show>
        <Show when={!hasUserHeader() && hasBotHeader()}>
          <BotProfileCardTrigger
            workspaceID={props.workspaceID}
            inline={botInline()}
            fallbackName={botName()}
            children={<div class={styles.avatar}>{botAvatar()}</div>}
          />
        </Show>
        <Show when={!props.showUser}>
          <div class={styles.time}>
            {new Date(parseInt(props.message.ts) * 1000).toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            )}
          </div>
        </Show>
      </div>
      <div class={styles.right}>
        <Show when={hasUserHeader()}>
          <div class={styles.header}>
            <span class={styles.username}>
              {props.profile!.profile.display_name ||
                props.profile!.profile.real_name}
            </span>
            <div class={styles.timeRight}>
              {new Date(parseInt(props.message.ts) * 1000).toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
            </div>
            <Show when={props.profile?.is_bot}>
              <ClankerChip />
            </Show>
          </div>
        </Show>
        <Show when={!hasUserHeader() && hasBotHeader()}>
          <div class={styles.header}>
            <span class={styles.username}>{botName()}</span>
            <div class={styles.timeRight}>
              {new Date(parseInt(props.message.ts) * 1000).toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
            </div>
            <ClankerChip />
          </div>
        </Show>
        <div class={styles.text}>
          <BlockKitRenderer blocks={props.message.blocks} />
          <Show when={props.message.edited?.ts}>
            <EditedIndicator />
          </Show>
        </div>
        <Show when={!!props.message.files?.length}>
          {(() => {
            const images = (props.message.files ?? []).filter((f) =>
              f.mimetype.startsWith("image/"),
            );

            const pdfs = (props.message.files ?? []).filter(
              (f) => f.mimetype === "application/pdf",
            );

            return (
              <>
                <div style={{ "margin-top": "8px" }}>
                  {images.map((file, idx) => (
                    <ImageComponent
                      file={file}
                      gallery={images}
                      galleryIndex={idx}
                    />
                  ))}
                  {pdfs.map((file) => (
                    <AttachmentCard file={file} />
                  ))}
                </div>
              </>
            );
          })()}
        </Show>
        <Show when={showInlineReplies()}>
          <ThreadRepliesButton
            message={props.message}
            workspaceID={props.workspaceID}
            onClick={() => props.onThreadClick?.(props.message)}
          />
        </Show>
        <div class={styles.actionsWrapper}>
          <MessageActions
            message={props.message}
            channelID={props.channelID}
            canDelete={props.message.user === userID}
            canOpenThread={inList()}
          />
        </div>
      </div>
    </div>
  );
}
