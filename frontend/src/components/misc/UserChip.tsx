import { createResource, Show } from "solid-js";
import { useAuth } from "../../AuthContext";
import styles from "./UserChip.module.css";
import { ResolveUsers } from "../../../bindings/fastslack/slackservice";

function UserChip(props: { userID: string }) {
  const { workspace } = useAuth();

  const [user] = createResource(
    () => ({ ws: workspace(), id: props.userID }),
    async ({ ws, id }) => {
      if (!ws) return null;
      try {
        const res = await ResolveUsers(ws, [id]);
        return res ? res[0] : null;
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        return null;
      }
    },
  );

  return (
    <span class={styles.userChip}>
      <span class={styles.name}>
        <Show when={!user.loading} fallback={"Loading"}>
          @{user()?.profile.display_name || "Unknown User"}
        </Show>
      </span>
    </span>
  );
}

export default UserChip;
