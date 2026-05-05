import { createResource, Show } from "solid-js";
import styles from "./Onboarding.module.css";
import { GetAvatarUrl } from "../utils/pfp";
import { ResolveUsers } from "../../bindings/fastslack/slackservice";
import { useAuth } from "../AuthContext";

export default function Onboarding(props: { proceed: () => void }) {
  const { session, workspace } = useAuth();
  const currentUserID = () =>
    session()?.workspaces[workspace()!]?.user_id ?? "";

  const [profile] = createResource(
    () => [workspace(), currentUserID()] as const,
    async ([ws, uid]) => {
      console.log("resource source:", ws, uid);
      if (!ws || !uid) return null;
      const users = await ResolveUsers(ws, [uid]).catch((e) => {
        console.error("Failed to resolve user profile:", e);
        return null;
      });
      console.log("Resolved user profile:", users);
      return users ? users[uid] : null;
    },
  );

  return (
    <div class={styles.container}>
      <Show when={profile()} fallback={<div class={styles.spinner} />}>
        <h1>
          Hi{" "}
          {profile()?.profile.display_name ||
            profile()?.profile.real_name ||
            "there"}
          !
        </h1>
        <div class={styles.pfp}>
          <img
            class={styles.avatar}
            src={GetAvatarUrl(profile()!, workspace()!, 512)}
            alt="Profile Picture"
            onError={(e) => console.log("img failed:", e.currentTarget.src)}
          />
        </div>
        <button class={styles.proceedButton} onClick={props.proceed}>
          Let's get started
        </button>
      </Show>
    </div>
  );
}
