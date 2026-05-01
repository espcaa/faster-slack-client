import type { HeaderBlock as HeaderBlockT } from "../types";

export default function HeaderBlock(props: { block: HeaderBlockT }) {
  return <h3 class="bk-header">{props.block.text?.text ?? ""}</h3>;
}
