import { createSignal, createEffect, Show } from "solid-js";
import { useAuth } from "../../AuthContext";
import { resolveUser, getCachedUser } from "../../utils/userResolver";
import type { UserProfile } from "../../../bindings/fastslack/shared";
import { UserProfileCardTrigger } from "../UserProfileCard";
import Mention from "./Mention";

function UserChip(props: { userID: string }) {
  const { workspace } = useAuth();

  const ws = workspace();
  const [user, setUser] = createSignal<UserProfile | null>(
    ws ? getCachedUser(ws, props.userID) : null,
  );

  createEffect(() => {
    const ws = workspace();
    if (!ws) return;
    if (user()) return;
    resolveUser(ws, props.userID).then((p) => {
      if (p) setUser(p);
    });
  });

  return (
    <Show when={user()} fallback={<Mention text={"@" + props.userID} />}>
      {(u) => (
        <UserProfileCardTrigger workspaceID={workspace()!} profile={u()}>
          <Mention
            text={
              "@" + u().profile.display_name ||
              u().profile.real_name ||
              "Unknown"
            }
          />
        </UserProfileCardTrigger>
      )}
    </Show>
  );
}

export default UserChip;
