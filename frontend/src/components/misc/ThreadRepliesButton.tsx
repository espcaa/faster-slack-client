import { createEffect, For } from "solid-js";
import { Message } from "../../../bindings/fastslack/shared";
import styles from "./ThreadRepliesButton.module.css";
import { MdRoundArrow_forward_ios } from "solid-icons/md";
import { chatStore, ensureUserInfo } from "../../stores/ChatStore";
import { GetAvatarUrl } from "../../utils/pfp";

function ThreadRepliesButton(props: {
  message: Message;
  workspaceID: string;
  onClick: () => void;
}) {
  const firstThreeReplyUsers = () =>
    props.message.reply_users?.slice(0, 3) ?? [];

  // trigger profile fetching
  createEffect(() => {
    const users = firstThreeReplyUsers();
    if (users.length === 0) return;

    users.forEach((userId) => {
      ensureUserInfo(props.workspaceID, userId);
    });
  });

  return (
    <button class={styles.threadRepliesButton} onClick={props.onClick}>
      <div class={styles.insideContainer}>
        <div class={styles.pfpContainer}>
          <For each={firstThreeReplyUsers()}>
            {(userID) => {
              const profile = () => chatStore.profiles[userID];

              return (
                <img
                  src={GetAvatarUrl(profile(), props.workspaceID, 32)}
                  alt={profile()?.profile.display_name || "User avatar"}
                  class={styles.avatar}
                />
              );
            }}
          </For>
        </div>

        <div class={styles.replyCount}>{props.message.reply_count} replies</div>

        <div class={styles.replyLastTime}>
          Last reply at{" "}
          {new Date(
            parseInt(props.message.latest_reply || props.message.ts) * 1000,
          ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      <MdRoundArrow_forward_ios class={styles.arrowIcon} />
    </button>
  );
}

export default ThreadRepliesButton;
