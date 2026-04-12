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
import UserProfileCardTrigger from "./misc/UserProfileCardTrigger";
import EditedIndicator from "./misc/EditedIndicator";

export default function MessageItem(props: {
  message: Message;
  profile?: UserProfile;
  showUser?: boolean;
  workspaceID: string;
  onThreadClick?: (message: Message) => void;
  showThreadButton: boolean;
}) {
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
            <div class="time-right">
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
        <Show
          when={
            props.message.reply_count &&
            props.message.reply_count > 0 &&
            props.showThreadButton
          }
        >
          <ThreadRepliesButton
            message={props.message}
            workspaceID={props.workspaceID}
            onClick={() => props.onThreadClick?.(props.message)}
          />
        </Show>
      </div>
    </div>
  );
}
