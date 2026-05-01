import type { JSX } from "solid-js";

export default function CodeBlock(props: {
  language?: string;
  children: JSX.Element;
}) {
  return (
    <pre class="bk-codeblock" data-language={props.language ?? undefined}>
      {props.language ? (
        <span class="bk-codeblock__lang">{props.language}</span>
      ) : null}
      <code
        class={
          props.language ? `bk-codeblock__code language-${props.language}` : "bk-codeblock__code"
        }
      >
        {props.children}
      </code>
    </pre>
  );
}
