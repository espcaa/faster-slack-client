import { For, Match, Switch } from "solid-js";
import RichTextBlock from "./blocks/RichTextBlock";

type Block = { type: string; block_id?: string; elements?: any[]; [key: string]: any };

export default function BlockKitRenderer(props: { blocks?: Block[] }) {
  return (
    <For each={props.blocks}>
      {(block) => (
        <Switch>
          <Match when={block.type === "rich_text"}>
            <RichTextBlock block={block as any} />
          </Match>
        </Switch>
      )}
    </For>
  );
}
