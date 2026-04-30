import { createResource, Show } from "solid-js";
import {
  GetChannelInfo,
  ResolveUsers,
} from "../../../bindings/fastslack/slackservice";
import { GetAvatarUrl } from "../../utils/pfp";
import styles from "./ChannelHeader.module.css";

export default function ChannelHeader(props: {
  teamID: string;
  channelID: string;
}) {
  const [channelInfo] = createResource(
    () => ({ team: props.teamID, chan: props.channelID }),
    async ({ team, chan }) => await GetChannelInfo(team, chan),
  );

  const [userProfile] = createResource(
    () => {
      const info = channelInfo();
      if (info?.is_im && info.user) {
        console.log("Resolving user for DM", info.user);
        return { team: props.teamID, userId: info.user };
      }
      return false;
    },
    async ({ team, userId }) => {
      const profiles = await ResolveUsers(team, [userId]);
      return profiles?.[0];
    },
  );

  return (
    <Show when={!channelInfo.loading}>
      <Show
        when={channelInfo()?.is_im}
        fallback={
          <div class={styles.channelHeader}>
            <span class={styles.hash}>#</span>{" "}
            <h2 class={styles.name}>{channelInfo()?.name}</h2>
            <p class={styles.topic}>{channelInfo()?.topic.value}</p>{" "}
          </div>
        }
      >
        <div class={styles.channelHeader}>
          <Show when={!userProfile.loading}>
            <img
              src={GetAvatarUrl(userProfile()!, props.teamID, 192)}
              alt=""
              class={styles.avatar}
              style={{ "margin-right": "12px" }}
            />
            <h2 class={styles.name}>
              {userProfile()?.profile.display_name || "Unknown User"}
            </h2>
          </Show>
        </div>
      </Show>
    </Show>
  );
}
