import { For, Match, Switch } from "solid-js";
import SlackText from "../mrkdwn";
import ElementRenderer from "../elements/ElementRenderer";
import type {
  ContextBlock as ContextBlockT,
  ImageElement,
  TextObject,
} from "../types";

export default function ContextBlock(props: { block: ContextBlockT }) {
  return (
    <div class="bk-context">
      <For each={props.block.elements}>
        {(el) => (
          <Switch>
            <Match when={el.type === "mrkdwn" || el.type === "plain_text"}>
              <SlackText text={el as TextObject} />
            </Match>
            <Match when={el.type === "image"}>
              <ElementRenderer element={el as ImageElement} />
            </Match>
          </Switch>
        )}
      </For>
    </div>
  );
}
