import { Show } from "solid-js";
import styles from "./UserProfileCard.module.css";
import { UserProfile } from "../../bindings/fastslack/shared";
import { GetAvatarUrl } from "../utils/pfp";
import EmojiComponent from "./misc/Emoji";
import { useNavigation } from "../NavigationContext";
import { GetIMByUserID } from "../../bindings/fastslack/slackservice";
import { MdRoundChat_bubble_outline } from "solid-icons/md";

function formatLocalTime(tzOffset: number): string {
  const localTime = new Date(
    Date.now() + tzOffset * 1000 - new Date().getTimezoneOffset() * 60 * 1000,
  );
  return (
    localTime.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }) + " local time"
  );
}

export default function UserProfileCard(props: {
  profile: UserProfile;
  workspaceID: string;
}) {
  const avatarUrl = GetAvatarUrl(props.profile, props.workspaceID, 192);
  const navigation = useNavigation();

  const handleMessageClick = async () => {
    try {
      const channel = await GetIMByUserID(props.workspaceID, props.profile.id);
      if (channel?.id) {
        navigation.selectChannel(channel.id);
      }
    } catch (e) {
      alert("Failed to open DM.");
    }
  };

  return (
    <div class={styles.card}>
      <div class={styles.infoContainer}>
        <img src={avatarUrl} class={styles.avatar} alt="" />
        <div class={styles.info}>
          <div class={styles.displayName}>
            {props.profile.profile.display_name ||
              props.profile.profile.real_name}
          </div>
          <Show when={props.profile.profile.title}>
            <div class={styles.title}>{props.profile.profile.title}</div>
          </Show>
        </div>
      </div>
      <div class={styles.divider} />

      <Show when={props.profile.tz_offset !== undefined}>
        <div class={styles.localTime}>
          {formatLocalTime(props.profile.tz_offset)}
        </div>
      </Show>
      <Show when={props.profile.profile.status_text}>
        <div class={styles.status}>
          <EmojiComponent
            name={props.profile.profile.status_emoji?.replace(/^:|:$/g, "")}
          />
          {props.profile.profile.status_text}
        </div>
      </Show>
      <button class={`${styles.messageBtn}`} onClick={handleMessageClick}>
        <MdRoundChat_bubble_outline />
        Message
      </button>
    </div>
  );
}
