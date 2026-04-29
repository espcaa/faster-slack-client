import { Show } from "solid-js";
import type {
  Message,
  UserProfile,
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
  return (
    <div class={`${styles.message} ${props.showUser ? styles.groupStart : ""}`}>
      <div class={styles.left}>
        <Show when={props.showUser && props.profile}>
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
        <Show when={props.showUser == false}>
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
        <Show when={props.showUser && props.profile}>
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
            return (
              <div style={{ "margin-top": "8px" }}>
                {images.map((file, idx) => (
                  <ImageComponent
                    file={file}
                    gallery={images}
                    galleryIndex={idx}
                  />
                ))}
              </div>
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
