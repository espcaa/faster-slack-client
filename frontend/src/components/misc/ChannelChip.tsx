// import { createSignal, createEffect, Show } from "solid-js";
// import { useAuth } from "../../AuthContext";
// import styles from "./UserChip.module.css";
// import { resolveUser, getCachedUser } from "../../utils/userResolver";
// import UserProfileCardTrigger from "./UserProfileCardTrigger";
// import { Channel, type UserProfile } from "../../../bindings/fastslack/shared";
// import { GetChannels } from "../../../bindings/fastslack/slackservice";

// function ChannelChip(props: { channelID: string }) {
//   const { workspace } = useAuth();

//   const ws = workspace();
//   const [user, setUser] = createSignal<Channel | null>(
//     ws ? GetChannels

//   createEffect(() => {
//     const ws = workspace();
//     if (!ws) return;
//     if (user()) return;
//     resolveUser(ws, props.userID).then((p) => {
//       if (p) setUser(p);
//     });
//   });

//   return (
//     <Show
//       when={user()}
//       fallback={<span class={styles.userChip}>@Loading...</span>}
//     >
//       {(u) => (
//         <UserProfileCardTrigger workspaceID={workspace()!} profile={u()}>
//           <span class={styles.userChip}>
//             <span class={styles.name}>
//               @{u().profile.display_name || u().profile.real_name || "Unknown"}
//             </span>
//           </span>
//         </UserProfileCardTrigger>
//       )}
//     </Show>
//   );
// }

// export default ChannelChip;
