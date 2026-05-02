import { JSX, Show } from "solid-js";
import Popover from "./misc/PopoverTrigger";

import styles from "./Actions.module.css";
import Card from "./misc/Card";

export type Action = {
  text: string;
  onClick: () => void;
  icon: JSX.Element;
};

export default function Actions(props: { actions: Action[] }) {
  return (
    <Show when={props.actions.length > 0}>
      <div class={styles.container}>
        {props.actions.map((action) => (
          <ActionButton
            text={action.text}
            onClick={action.onClick}
            icon={action.icon}
          />
        ))}
      </div>
    </Show>
  );
}

function ActionButton(props: {
  text: string;
  onClick: () => void;
  icon: JSX.Element;
}) {
  return (
    <button class={styles.button} onClick={props.onClick}>
      <Popover
        content={
          <Card>
            <p>{props.text}</p>
          </Card>
        }
      >
        {props.icon}
      </Popover>
    </button>
  );
}
