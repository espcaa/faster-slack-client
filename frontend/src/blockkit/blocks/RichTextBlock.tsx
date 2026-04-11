import { For, Match, Switch, type JSX } from "solid-js";
import UserChip from "../../components/misc/UserChip";
import EmojiComponent from "../../components/misc/Emoji";

type RichTextStyle = {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
  underline?: boolean;
  highlight?: boolean;
};

function isOnlyEmoji(elements: RichTextSubElement[]): boolean {
  if (elements.length !== 1 || elements[0].type !== "rich_text_section")
    return false;

  const section = elements[0];
  return (
    section.elements.length > 0 &&
    section.elements.length <= 10 &&
    section.elements.every((el) => el.type === "emoji")
  );
}

type RichTextElement =
  | { type: "text"; text: string; style?: RichTextStyle }
  | {
      type: "link";
      url: string;
      text?: string;
      style?: RichTextStyle;
      unsafe?: boolean;
    }
  | { type: "emoji"; name: string; unicode?: string }
  | { type: "user"; user_id: string; style?: RichTextStyle }
  | { type: "channel"; channel_id: string; style?: RichTextStyle }
  | { type: "usergroup"; usergroup_id: string; style?: RichTextStyle }
  | {
      type: "broadcast";
      range: "here" | "channel" | "everyone";
      style?: RichTextStyle;
    }
  | { type: "color"; value: string; style?: RichTextStyle }
  | {
      type: "date";
      timestamp: number;
      format: string;
      url?: string;
      fallback?: string;
      style?: RichTextStyle;
    };

type RichTextSubElement =
  | { type: "rich_text_section"; elements: RichTextElement[] }
  | {
      type: "rich_text_list";
      style: "bullet" | "ordered";
      elements: { type: "rich_text_section"; elements: RichTextElement[] }[];
      indent?: number;
      offset?: number;
      border?: number;
    }
  | {
      type: "rich_text_preformatted";
      elements: RichTextElement[];
      border?: number;
      language?: string;
    }
  | { type: "rich_text_quote"; elements: RichTextElement[]; border?: number };

function applyStyle(node: JSX.Element, style?: RichTextStyle): JSX.Element {
  if (!style) return node;
  let n = node;
  if (style.code) n = <code>{n}</code>;
  if (style.bold) n = <strong>{n}</strong>;
  if (style.italic) n = <em>{n}</em>;
  if (style.strike) n = <s>{n}</s>;
  if (style.underline) n = <u>{n}</u>;
  if (style.highlight) n = <mark>{n}</mark>;
  return n;
}

function RichTextElementView(props: {
  el: RichTextElement;
  isOnlyEmoji?: boolean;
}) {
  return (
    <Switch fallback={null}>
      <Match when={props.el.type === "text" && props.el}>
        {(el) =>
          applyStyle(
            <>{(el() as Extract<RichTextElement, { type: "text" }>).text}</>,
            (el() as Extract<RichTextElement, { type: "text" }>).style,
          )
        }
      </Match>
      <Match when={props.el.type === "link" && props.el}>
        {(el) => {
          const e = el() as Extract<RichTextElement, { type: "link" }>;
          return applyStyle(
            <a href={e.url} target="_blank" rel="noopener noreferrer">
              {e.text ?? e.url}
            </a>,
            e.style,
          );
        }}
      </Match>
      <Match when={props.el.type === "emoji" && props.el}>
        {(el) => {
          const e = el() as Extract<RichTextElement, { type: "emoji" }>;
          if (e.unicode) {
            return String.fromCodePoint(
              ...e.unicode.split("-").map((cp) => parseInt(cp, 16)),
            );
          }
          return (
            <EmojiComponent name={e.name} bigVersion={props.isOnlyEmoji} />
          );
        }}
      </Match>
      <Match when={props.el.type === "user" && props.el}>
        {(el) => {
          const e = el() as Extract<RichTextElement, { type: "user" }>;
          return <UserChip userID={e.user_id} />;
        }}
      </Match>
      <Match when={props.el.type === "channel" && props.el}>
        {(el) => {
          const e = el() as Extract<RichTextElement, { type: "channel" }>;
          return applyStyle(
            <span class="mention">#{e.channel_id}</span>,
            e.style,
          );
        }}
      </Match>
      <Match when={props.el.type === "usergroup" && props.el}>
        {(el) => {
          const e = el() as Extract<RichTextElement, { type: "usergroup" }>;
          return applyStyle(
            <span class="mention">@{e.usergroup_id}</span>,
            e.style,
          );
        }}
      </Match>
      <Match when={props.el.type === "broadcast" && props.el}>
        {(el) => {
          const e = el() as Extract<RichTextElement, { type: "broadcast" }>;
          return applyStyle(<span class="mention">@{e.range}</span>, e.style);
        }}
      </Match>
      <Match when={props.el.type === "color" && props.el}>
        {(el) => {
          const e = el() as Extract<RichTextElement, { type: "color" }>;
          return (
            <span class="color-chip">
              <span
                style={{
                  background: e.value,
                  width: "12px",
                  height: "12px",
                  display: "inline-block",
                  "border-radius": "2px",
                  "vertical-align": "middle",
                  "margin-right": "4px",
                }}
              />
              {e.value}
            </span>
          );
        }}
      </Match>
      <Match when={props.el.type === "date" && props.el}>
        {(el) => {
          const e = el() as Extract<RichTextElement, { type: "date" }>;
          const formatted = new Date(e.timestamp * 1000).toLocaleDateString();
          const node = e.url ? (
            <a href={e.url}>{formatted}</a>
          ) : (
            <>{formatted}</>
          );
          return applyStyle(node, e.style);
        }}
      </Match>
    </Switch>
  );
}

function SectionElements(props: {
  elements: RichTextElement[];
  isOnlyEmoji?: boolean;
}) {
  return (
    <For each={props.elements}>
      {(el) => <RichTextElementView el={el} isOnlyEmoji={props.isOnlyEmoji} />}
    </For>
  );
}

export default function RichTextBlock(props: {
  block: { elements: RichTextSubElement[] };
}) {
  const onlyEmoji = isOnlyEmoji(props.block.elements);

  return (
    <div style={{ "white-space": "pre-wrap" }}>
      <For each={props.block.elements}>
        {(sub) => (
          <Switch fallback={null}>
            <Match when={sub.type === "rich_text_section"}>
              <span>
                <SectionElements
                  elements={
                    (
                      sub as Extract<
                        RichTextSubElement,
                        { type: "rich_text_section" }
                      >
                    ).elements
                  }
                  isOnlyEmoji={onlyEmoji}
                />
              </span>
            </Match>
            <Match when={sub.type === "rich_text_preformatted"}>
              <pre>
                <SectionElements
                  elements={
                    (
                      sub as Extract<
                        RichTextSubElement,
                        { type: "rich_text_preformatted" }
                      >
                    ).elements
                  }
                  isOnlyEmoji={onlyEmoji}
                />
              </pre>
            </Match>
            <Match when={sub.type === "rich_text_quote"}>
              <blockquote>
                <SectionElements
                  elements={
                    (
                      sub as Extract<
                        RichTextSubElement,
                        { type: "rich_text_quote" }
                      >
                    ).elements
                  }
                />
              </blockquote>
            </Match>
            <Match when={sub.type === "rich_text_list"}>
              {(() => {
                const list = sub as Extract<
                  RichTextSubElement,
                  { type: "rich_text_list" }
                >;
                const items = (
                  <For each={list.elements}>
                    {(item) => (
                      <li>
                        <SectionElements elements={item.elements} />
                      </li>
                    )}
                  </For>
                );
                return list.style === "ordered" ? (
                  <ol start={list.offset ? list.offset + 1 : undefined}>
                    {items}
                  </ol>
                ) : (
                  <ul>{items}</ul>
                );
              })()}
            </Match>
          </Switch>
        )}
      </For>
    </div>
  );
}
