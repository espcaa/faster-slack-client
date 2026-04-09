import { createEffect, createSignal, For } from "solid-js";
import { Message, UserProfile } from "../../../bindings/fastslack/shared";
import styles from "./ThreadRepliesButton.module.css";
import { ResolveUsers } from "../../../bindings/fastslack/slackservice";
import { MdRoundArrow_forward_ios } from "solid-icons/md";

function ThreadRepliesButton(props: {
  message: Message;
  workspaceID: string;
  onClick: () => void;
}) {
  const getAvatarUrl = (profile?: UserProfile) => {
    if (!profile || !profile.profile) return "";
    const hash = profile.profile.avatar_hash;
    const userId = profile.id;
    const workspaceID = props.workspaceID;

    return `https://ca.slack-edge.com/${workspaceID}-${userId}-${hash}-48`;
  };

  const [profiles, setProfiles] = createSignal<Record<string, UserProfile>>({});
  let firstThreeReplyUsers = props.message.reply_users
    ? props.message.reply_users.slice(0, 3)
    : [];

  const getReplyUsers = async () => {
    let userProfiles = await ResolveUsers(
      props.workspaceID,
      firstThreeReplyUsers,
    );
    const profileMap: Record<string, UserProfile> = {};
    for (const p of userProfiles) profileMap[p.id] = p;
    setProfiles(profileMap);
  };

  createEffect(() => {
    if (props.message.reply_users && props.message.reply_users.length > 0) {
      getReplyUsers();
    }
  });

  return (
    <button class={styles.threadRepliesButton} onClick={props.onClick}>
      <div class={styles.insideContainer}>
        <div class={styles.pfpContainer}>
          <For each={firstThreeReplyUsers}>
            {(userID) => (
              <img
                src={getAvatarUrl(profiles()[userID])}
                alt={`${profiles()[userID]?.profile.display_name}'s profile picture`}
                class={styles.avatar}
              />
            )}
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
