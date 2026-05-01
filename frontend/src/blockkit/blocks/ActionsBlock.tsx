import { For } from "solid-js";
import ElementRenderer from "../elements/ElementRenderer";
import type { ActionsBlock as ActionsBlockT } from "../types";

export default function ActionsBlock(props: { block: ActionsBlockT }) {
  return (
    <div class="bk-actions">
      <For each={props.block.elements}>
        {(el) => <ElementRenderer element={el} />}
      </For>
    </div>
  );
}
