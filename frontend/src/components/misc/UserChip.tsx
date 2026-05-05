import { Show } from "solid-js";
import { useAuth } from "../../AuthContext";
import { UserProfileCardTrigger } from "../UserProfileCard";
import Mention from "./Mention";
import { chatStore, ensureUserInfo } from "../../stores/ChatStore";

function UserChip(props: { userID: string }) {
  const { workspace } = useAuth();

  const user = () => {
    const ws = workspace();
    if (!ws) return null;

    ensureUserInfo(ws, props.userID);

    return chatStore.profiles[props.userID];
  };

  return (
    <Show when={user()} fallback={<Mention text={"@" + props.userID} />}>
      {(u) => (
        <UserProfileCardTrigger workspaceID={workspace()!} profile={u()}>
          <Mention
            text={
              "@" +
              (u().profile.display_name || u().profile.real_name || "Unknown")
            }
          />
        </UserProfileCardTrigger>
      )}
    </Show>
  );
}

export default UserChip;
