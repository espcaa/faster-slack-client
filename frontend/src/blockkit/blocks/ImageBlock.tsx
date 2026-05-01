import { Show } from "solid-js";
import type { ImageBlock as ImageBlockT } from "../types";

export default function ImageBlock(props: { block: ImageBlockT }) {
  const src = () =>
    props.block.image_url ?? props.block.slack_file?.url ?? "";
  return (
    <figure class="bk-image-block">
      <Show when={props.block.title}>
        <figcaption class="bk-image-block__title">
          {props.block.title!.text}
        </figcaption>
      </Show>
      <Show when={src()}>
        <img src={src()} alt={props.block.alt_text ?? ""} />
      </Show>
    </figure>
  );
}
