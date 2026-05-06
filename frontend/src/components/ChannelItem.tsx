import { Show } from "solid-js";
import { Channel } from "../../bindings/fastslack/shared";
import styles from "./Sidebar.module.css";
import { useNavigation } from "../NavigationContext";
import { MdRoundLock } from "solid-icons/md";
import { GetAvatarUrl } from "../utils/pfp";

interface ChannelItemProps {
  channel: Channel;
  teamID: string;
  userProfile?: any;
}

export default function ChannelItem(props: ChannelItemProps) {
  const navigation = useNavigation();
  const isActive = () => navigation.selectedChannel() === props.channel.id;

  return (
    <div
      class={styles.item}
      classList={{ [styles.active]: isActive() }}
      onClick={() => navigation.selectChannel(props.channel.id)}
    >
      <Show
        when={props.channel.is_im}
        fallback={
          <>
            <span class={props.channel.is_private ? styles.lock : styles.hash}>
              {props.channel.is_private ? <MdRoundLock size={14} /> : "#"}
            </span>
            {props.channel.name}
          </>
        }
      >
        <div class={styles.dmItem}>
          <Show
            when={props.userProfile}
            fallback={<span>{props.channel.user}</span>}
          >
            {(u) => (
              <>
                <img
                  src={GetAvatarUrl(u(), props.teamID)}
                  alt="Avatar"
                  class={styles.avatar}
                />
                <span>
                  {u().profile?.display_name ||
                    u().profile?.real_name ||
                    props.channel.user}
                </span>
              </>
            )}
          </Show>
        </div>
      </Show>
    </div>
  );
}
