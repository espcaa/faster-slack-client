import { createResource, mergeProps, Show } from "solid-js";
import { useAuth } from "../../AuthContext";
import { emojiVersion, getEmoji } from "../../utils/emojiClient";
import Popover from "./PopoverTrigger";
import styles from "./Emoji.module.css";
import { JSX } from "solid-js/h/jsx-runtime";

export default function EmojiComponent(props: {
  name: string;
  bigVersion?: boolean;
  popover?: boolean;
  fillContainer?: boolean;
}) {
  const emojiView = (imgAdditionalStyle: JSX.CSSProperties = {}) => {
    return (
      <Show
        when={emoji()!.unicode}
        fallback={
          <Show when={emoji()!.value} fallback={<span>:{props.name}:</span>}>
            <img
              src={emoji()!.value}
              alt={`:${props.name}:`}
              style={{
                width: merged.fillContainer
                  ? "100%"
                  : merged.bigVersion
                    ? "32px"
                    : "20px",
                height: merged.fillContainer
                  ? "100%"
                  : merged.bigVersion
                    ? "32px"
                    : "20px",
                ...imgAdditionalStyle,
              }}
            />
          </Show>
        }
      >
        <span
          style={{
            "font-size": merged.fillContainer
              ? "100cqw"
              : merged.bigVersion
                ? "32px"
                : "20px",
            "line-height": "1",
            "vertical-align": "middle",
          }}
        >
          {emoji()!.unicode}
        </span>
      </Show>
    );
  };

  const merged = mergeProps({ bigVersion: false, popover: false }, props);

  const { workspace } = useAuth();

  const [emoji] = createResource(
    () => ({ ws: workspace(), name: props.name, v: emojiVersion() }),
    async ({ ws, name }) => {
      if (!ws) return null;
      return getEmoji(ws, name);
    },
  );

  return (
    <Show
      when={!emoji.loading && emoji()}
      fallback={<span>:{props.name}:</span>}
    >
      {merged.popover ? (
        <Popover
          content={
            <div class={styles.popoverContainer}>
              {emojiView({ width: "64px", height: "64px" })}
              <h3 class={styles.emojiName}>:{props.name}:</h3>
            </div>
          }
        >
          {emojiView()}
        </Popover>
      ) : (
        emojiView()
      )}
    </Show>
  );
}
