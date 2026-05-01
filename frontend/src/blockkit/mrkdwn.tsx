import { For, Match, Switch, type JSX } from "solid-js";
import UserChip from "../components/misc/UserChip";
import EmojiComponent from "../components/misc/Emoji";
import type { TextObject } from "./types";

type Style = {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
};

export type MrkdwnNode =
  | { kind: "text"; text: string; style?: Style }
  | { kind: "br" }
  | { kind: "link"; url: string; label?: string }
  | { kind: "user"; id: string; label?: string }
  | { kind: "channel"; id: string; label?: string }
  | { kind: "broadcast"; range: string }
  | { kind: "subteam"; id: string; label?: string }
  | {
      kind: "date";
      ts: number;
      format: string;
      url?: string;
      fallback?: string;
    }
  | { kind: "emoji"; name: string };

const TOKEN_RE =
  /<([^>]+)>|:([a-zA-Z0-9_+\-']+):|\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~|`([^`\n]+)`|\n/g;

const EMOJI_RE = /:([a-zA-Z0-9_+\-']+):|\n/g;

export function parseMrkdwn(input: string): MrkdwnNode[] {
  return scan(input, TOKEN_RE);
}

export function parsePlainTextEmoji(input: string): MrkdwnNode[] {
  return scan(input, EMOJI_RE);
}

function scan(input: string, re: RegExp): MrkdwnNode[] {
  const nodes: MrkdwnNode[] = [];
  let last = 0;
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    if (m.index > last) {
      nodes.push({ kind: "text", text: input.slice(last, m.index) });
    }
    if (re === EMOJI_RE) {
      if (m[1] !== undefined) nodes.push({ kind: "emoji", name: m[1] });
      else nodes.push({ kind: "br" });
    } else if (m[1] !== undefined) nodes.push(parseAngleBracket(m[1]));
    else if (m[2] !== undefined) nodes.push({ kind: "emoji", name: m[2] });
    else if (m[3] !== undefined) pushStyled(nodes, m[3], { bold: true });
    else if (m[4] !== undefined) pushStyled(nodes, m[4], { italic: true });
    else if (m[5] !== undefined) pushStyled(nodes, m[5], { strike: true });
    else if (m[6] !== undefined)
      nodes.push({ kind: "text", text: m[6], style: { code: true } });
    else nodes.push({ kind: "br" });
    last = re.lastIndex;
  }
  if (last < input.length) {
    nodes.push({ kind: "text", text: input.slice(last) });
  }
  return nodes;
}

function pushStyled(nodes: MrkdwnNode[], text: string, style: Style) {
  for (const n of parsePlainTextEmoji(text)) {
    if (n.kind === "text") nodes.push({ ...n, style });
    else nodes.push(n);
  }
}

function parseAngleBracket(content: string): MrkdwnNode {
  if (content.startsWith("@")) {
    const [id, label] = content.slice(1).split("|");
    return { kind: "user", id, label };
  }
  if (content.startsWith("#")) {
    const [id, label] = content.slice(1).split("|");
    return { kind: "channel", id, label };
  }
  if (content.startsWith("!date^")) {
    const pipe = content.indexOf("|");
    const main = pipe === -1 ? content : content.slice(0, pipe);
    const fallback = pipe === -1 ? undefined : content.slice(pipe + 1);
    const parts = main.split("^");
    return {
      kind: "date",
      ts: parseInt(parts[1] ?? "0", 10),
      format: parts[2] ?? "",
      url: parts[3],
      fallback,
    };
  }
  if (content.startsWith("!subteam^")) {
    const [main, label] = content.split("|");
    return { kind: "subteam", id: main.split("^")[1] ?? "", label };
  }
  if (content.startsWith("!")) {
    const [name] = content.slice(1).split("|");
    return { kind: "broadcast", range: name };
  }
  const pipe = content.indexOf("|");
  if (pipe === -1) return { kind: "link", url: content };
  return {
    kind: "link",
    url: content.slice(0, pipe),
    label: content.slice(pipe + 1),
  };
}

function formatSlackDate(ts: number, format: string): string {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const replacements: Record<string, string> = {
    "{date_num}": `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    "{date}": d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    "{date_short}": d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    "{date_long}": d.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    "{date_pretty}": d.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    "{date_short_pretty}": d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    "{date_long_pretty}": d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    "{time}": d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    "{time_secs}": d.toLocaleTimeString(),
  };
  return Object.entries(replacements).reduce(
    (acc, [k, v]) => acc.split(k).join(v),
    format,
  );
}

function applyStyle(node: JSX.Element, style?: Style): JSX.Element {
  if (!style) return node;
  let n = node;
  if (style.code) n = <code>{n}</code>;
  if (style.bold) n = <strong>{n}</strong>;
  if (style.italic) n = <em>{n}</em>;
  if (style.strike) n = <s>{n}</s>;
  return n;
}

function MrkdwnNodeView(props: { node: MrkdwnNode }) {
  return (
    <Switch fallback={null}>
      <Match when={props.node.kind === "text" && props.node}>
        {(n) => {
          const t = n() as Extract<MrkdwnNode, { kind: "text" }>;
          return applyStyle(<>{t.text}</>, t.style);
        }}
      </Match>
      <Match when={props.node.kind === "br"}>{"\n"}</Match>
      <Match when={props.node.kind === "link" && props.node}>
        {(n) => {
          const l = n() as Extract<MrkdwnNode, { kind: "link" }>;
          return (
            <a href={l.url} target="_blank" rel="noopener noreferrer">
              {l.label ?? l.url}
            </a>
          );
        }}
      </Match>
      <Match when={props.node.kind === "user" && props.node}>
        {(n) => {
          const u = n() as Extract<MrkdwnNode, { kind: "user" }>;
          return <UserChip userID={u.id} />;
        }}
      </Match>
      <Match when={props.node.kind === "channel" && props.node}>
        {(n) => {
          const c = n() as Extract<MrkdwnNode, { kind: "channel" }>;
          return <span class="bk-mention">#{c.label ?? c.id}</span>;
        }}
      </Match>
      <Match when={props.node.kind === "broadcast" && props.node}>
        {(n) => {
          const b = n() as Extract<MrkdwnNode, { kind: "broadcast" }>;
          return <span class="bk-mention">@{b.range}</span>;
        }}
      </Match>
      <Match when={props.node.kind === "subteam" && props.node}>
        {(n) => {
          const s = n() as Extract<MrkdwnNode, { kind: "subteam" }>;
          return <span class="bk-mention">{s.label ?? `@${s.id}`}</span>;
        }}
      </Match>
      <Match when={props.node.kind === "emoji" && props.node}>
        {(n) => {
          const e = n() as Extract<MrkdwnNode, { kind: "emoji" }>;
          return <EmojiComponent name={e.name} popover={true} />;
        }}
      </Match>
      <Match when={props.node.kind === "date" && props.node}>
        {(n) => {
          const d = n() as Extract<MrkdwnNode, { kind: "date" }>;
          const text = formatSlackDate(d.ts, d.format) || d.fallback || "";
          return d.url ? (
            <a href={d.url} target="_blank" rel="noopener noreferrer">
              {text}
            </a>
          ) : (
            <>{text}</>
          );
        }}
      </Match>
    </Switch>
  );
}

export function MrkdwnNodes(props: { nodes: MrkdwnNode[] }) {
  return (
    <For each={props.nodes}>{(n) => <MrkdwnNodeView node={n} />}</For>
  );
}

export default function SlackText(props: { text: TextObject; inline?: boolean }) {
  const Wrap = (children: JSX.Element) =>
    props.inline ? (
      <>{children}</>
    ) : (
      <span style={{ "white-space": "pre-wrap" }}>{children}</span>
    );

  if (props.text.type === "plain_text") {
    const emoji = props.text.emoji !== false;
    if (!emoji) return Wrap(<>{props.text.text}</>);
    return Wrap(<MrkdwnNodes nodes={parsePlainTextEmoji(props.text.text)} />);
  }
  return Wrap(<MrkdwnNodes nodes={parseMrkdwn(props.text.text)} />);
}
