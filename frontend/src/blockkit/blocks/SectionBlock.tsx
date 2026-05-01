import { Show, For } from "solid-js";
import SlackText from "../mrkdwn";
import ElementRenderer from "../elements/ElementRenderer";
import type { SectionBlock as SectionBlockT } from "../types";

export default function SectionBlock(props: { block: SectionBlockT }) {
  return (
    <div class="bk-section">
      <div class="bk-section__body">
        <Show when={props.block.text}>
          <div class="bk-section__text">
            <SlackText text={props.block.text!} />
          </div>
        </Show>
        <Show when={props.block.fields?.length}>
          <div class="bk-section__fields">
            <For each={props.block.fields}>
              {(field) => (
                <div class="bk-section__field">
                  <SlackText text={field} />
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
      <Show when={props.block.accessory}>
        <div class="bk-section__accessory">
          <ElementRenderer element={props.block.accessory!} />
        </div>
      </Show>
    </div>
  );
}
