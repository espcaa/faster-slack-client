import { For, Match, Switch } from "solid-js";
import RichTextBlock from "./blocks/RichTextBlock";
import SectionBlock from "./blocks/SectionBlock";
import ActionsBlock from "./blocks/ActionsBlock";
import ContextBlock from "./blocks/ContextBlock";
import HeaderBlock from "./blocks/HeaderBlock";
import DividerBlock from "./blocks/DividerBlock";
import ImageBlock from "./blocks/ImageBlock";
import type { Block } from "./types";

export default function BlockKitRenderer(props: { blocks?: Block[] }) {
  return (
    <div class="bk-blocks">
      <For each={props.blocks}>
        {(block) => (
          <Switch
            fallback={
              <div class="bk-unsupported">
                [unsupported block: {block.type}]
              </div>
            }
          >
            <Match when={block.type === "rich_text"}>
              <RichTextBlock block={block as any} />
            </Match>
            <Match when={block.type === "section"}>
              <SectionBlock block={block as any} />
            </Match>
            <Match when={block.type === "actions"}>
              <ActionsBlock block={block as any} />
            </Match>
            <Match when={block.type === "context"}>
              <ContextBlock block={block as any} />
            </Match>
            <Match when={block.type === "header"}>
              <HeaderBlock block={block as any} />
            </Match>
            <Match when={block.type === "divider"}>
              <DividerBlock />
            </Match>
            <Match when={block.type === "image"}>
              <ImageBlock block={block as any} />
            </Match>
          </Switch>
        )}
      </For>
    </div>
  );
}
