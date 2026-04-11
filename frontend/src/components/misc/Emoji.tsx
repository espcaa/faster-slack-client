import { createResource, Show } from "solid-js";
import { ResolveEmojis } from "../../../bindings/fastslack/slackservice";
import { useAuth } from "../../AuthContext";

export default function EmojiComponent(props: {
  name: string;
  bigVersion?: boolean;
}) {
  const { workspace } = useAuth();

  const [emoji] = createResource(
    () => ({ ws: workspace(), name: props.name }),
    async ({ ws, name }) => {
      if (!ws) return null;
      try {
        const res = await ResolveEmojis(ws, [name]);
        return res ? res[0] : null;
      } catch (error) {
        console.error("Failed to resolve emoji:", error);
        return null;
      }
    },
  );

  return (
    <Show
      when={!emoji.loading && emoji()?.value}
      fallback={<span>:{props.name}:</span>}
    >
      <img
        src={emoji()!.value}
        alt={`:${props.name}:`}
        style={{
          width: props.bigVersion ? "32px" : "20px",
          height: props.bigVersion ? "32px" : "20px",
          "vertical-align": "middle",
        }}
      />
    </Show>
  );
}
