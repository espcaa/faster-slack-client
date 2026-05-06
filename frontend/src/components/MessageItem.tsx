import { createMemo, Show } from "solid-js";
import {
  AppProfile,
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
import {
  chatStore,
  ensureBotInfo,
  ensureUserInfo,
  setActiveThread,
} from "../stores/ChatStore";

import AttachmentCard from "./media/AttachmentCard";

export interface Author {
  id: string;
  name: string;
  avatarUrl: string;
  isBot: boolean;
  type: "user" | "bot" | "system";
  raw?: UserProfile | AppProfile;
}

export default function MessageItem(props: {
  message: Message;
  channelID: string;
  showUser?: boolean;
  onThreadClick: (message: Message) => void;
  inThread?: boolean;
}) {
  // setup things
  const { session, workspace } = useAuth();
  const currentUserID = () =>
    session()?.workspaces[workspace()!]?.user_id ?? "";

  // who wrote ts
  const author = createMemo(() => {
    if (props.message.user) {
      ensureUserInfo(workspace()!, props.message.user);
      const profile = chatStore.profiles[props.message.user];
      if (profile) {
        return {
          id: props.message.user,
          name: profile.profile.display_name || profile.profile.real_name,
          avatarUrl: GetAvatarUrl(profile, workspace()!),
          isBot: !!profile.is_bot,
          type: "user",
          raw: profile,
        } as Author;
      } else {
        return {
          id: props.message.user,
          name: props.message.username || "Unknown User",
          avatarUrl: "",
          isBot: false,
          type: "user",
        } as Author;
      }
    } else if (props.message.bot_id) {
      ensureBotInfo(workspace()!, props.message.bot_id);
      const bot = chatStore.bots[props.message.bot_id];
      return {
        id: props.message.bot_id,
        name: bot?.name || props.message.username || "Bot",
        avatarUrl:
          bot?.auth?.icons?.image_192 ||
          bot?.icons?.image_192 ||
          bot?.icons?.image_72 ||
          "",
        isBot: true,
        type: "bot",
        raw: props.message.bot_profile,
      } as Author;
    } else {
      return {
        id: "system",
        name: "System",
        avatarUrl: "",
        isBot: false,
        type: "system",
      } as Author;
    }
  });

  return (
    <div class={`${styles.message} ${props.showUser ? styles.groupStart : ""}`}>
      <div class={styles.left}>
        <Show when={author()} keyed>
          {(user) => (
            <div>
              <Show when={user.type === "user" && props.showUser && user.raw}>
                <UserProfileCardTrigger
                  profile={user.raw as UserProfile}
                  workspaceID={workspace()!}
                  children={
                    <img
                      src={user.avatarUrl}
                      alt={`${user.name}'s profile picture`}
                      class={styles.avatar}
                    />
                  }
                />
              </Show>
              <Show when={!props.showUser}>
                <div class={styles.time}>
                  {new Date(
                    parseInt(props.message.ts) * 1000,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </Show>
              <Show when={user.type === "bot" && props.showUser}>
                <img
                  src={user.avatarUrl}
                  alt={`${user.name}'s profile picture`}
                  class={styles.avatar}
                />
              </Show>
            </div>
          )}
        </Show>
      </div>
      <div class={styles.right}>
        <Show when={props.showUser}>
          <Show when={author()} keyed>
            {(user) => (
              <div class={styles.header}>
                <span class={styles.username}>
                  <Show when={user.type == "user" && user.raw}>
                    {(user.raw as UserProfile).profile.display_name ||
                      user.name}
                  </Show>
                  <Show when={user.type == "user" && !user.raw}>
                    {user.name}
                  </Show>
                  <Show when={user.type == "bot" && user.raw}>
                    {(user.raw as AppProfile).bot_user?.username || user.name}
                  </Show>
                </span>
                <div class={styles.timeRight}>
                  {new Date(
                    parseInt(props.message.ts) * 1000,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <Show
                  when={
                    user.type == "user" &&
                    user.raw &&
                    (user.raw as UserProfile).is_bot
                  }
                >
                  <ClankerChip />
                </Show>
                <Show when={user.type == "bot"}>
                  <ClankerChip />
                </Show>
              </div>
            )}
          </Show>
        </Show>
        <div class={styles.text}>
          <Show
            when={props.message.subtype === "tombstone"}
            fallback={
              <>
                <BlockKitRenderer blocks={props.message.blocks} />
                <Show when={props.message.edited?.ts}>
                  <EditedIndicator />
                </Show>
              </>
            }
          >
            This message was deleted.
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
        <Show when={props.message.reply_count && !props.inThread}>
          <ThreadRepliesButton
            message={props.message}
            workspaceID={workspace()!}
            onClick={() => setActiveThread(props.message.ts)}
          />
        </Show>
        <div class={styles.actionsWrapper}>
          <MessageActions
            message={props.message}
            channelID={props.channelID}
            canDelete={props.message.user === currentUserID()}
            canOpenThread={true}
            handleThreadClick={props.onThreadClick}
          />
        </div>
      </div>
    </div>
  );
}
