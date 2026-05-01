import { Match, Switch } from "solid-js";
import SlackText from "../mrkdwn";
import type {
  BlockElement,
  ButtonElement,
  ImageElement,
  OverflowElement,
} from "../types";

function ButtonView(props: { el: ButtonElement }) {
  const cls = `bk-button bk-button--${props.el.style ?? "default"}`;
  const label = <SlackText text={props.el.text} inline />;
  if (props.el.url) {
    return (
      <a
        class={cls}
        href={props.el.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
      </a>
    );
  }
  return (
    <button class={cls} type="button" data-action-id={props.el.action_id}>
      {label}
    </button>
  );
}

function ImageView(props: { el: ImageElement }) {
  const src = props.el.image_url ?? props.el.slack_file?.url ?? "";
  if (!src) return null;
  return <img class="bk-image" src={src} alt={props.el.alt_text ?? ""} />;
}

function OverflowView(props: { el: OverflowElement }) {
  return (
    <select class="bk-overflow" disabled data-action-id={props.el.action_id}>
      {props.el.options.map((o) => (
        <option value={o.value}>{o.text.text}</option>
      ))}
    </select>
  );
}

export default function ElementRenderer(props: { element: BlockElement }) {
  return (
    <Switch
      fallback={
        <span class="bk-unsupported">[unsupported: {props.element.type}]</span>
      }
    >
      <Match when={props.element.type === "button"}>
        <ButtonView el={props.element as ButtonElement} />
      </Match>
      <Match when={props.element.type === "image"}>
        <ImageView el={props.element as ImageElement} />
      </Match>
      <Match when={props.element.type === "overflow"}>
        <OverflowView el={props.element as OverflowElement} />
      </Match>
    </Switch>
  );
}
