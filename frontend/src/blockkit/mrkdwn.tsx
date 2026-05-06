import RichTextBlock from "./blocks/RichTextBlock";
import type {
  RichTextElement,
  RichTextStyle,
  RichTextSubElement,
  TextObject,
} from "./types";

const SLACK_ANGLE_RE = /<([^>]+)>/g;

function parseMrkdwn(text: string): RichTextElement[] {
  const elements: RichTextElement[] = [];

  const parts = text.split(SLACK_ANGLE_RE);

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      elements.push(parseAngleToken(parts[i]));
    } else {
      elements.push(...parseInlineMarkdown(parts[i]));
    }
  }

  return elements;
}

export function parseAngleToken(content: string): RichTextElement {
  if (content.startsWith(":")) {
    const name = content.slice(1, content.indexOf(":", 1));
    return { type: "emoji", name };
  }
  if (content.startsWith("@"))
    return { type: "user", user_id: content.slice(1).split("|")[0] };
  if (content.startsWith("#")) {
    const [id, label] = content.slice(1).split("|");
    return { type: "channel", channel_id: label ?? id };
  }
  if (content.startsWith("!")) {
    const range = content.slice(1).split("|")[0];
    if (range === "here" || range === "channel")
      return { type: "broadcast", range };
  }
  const pipe = content.indexOf("|");
  const label = content.slice(pipe + 1);
  if (!label) return { type: "link", url: content.slice(0, pipe) };
  return {
    type: "link",
    url: content.slice(0, pipe),
    text: label,
  };
}

function parseInlineMarkdown(
  text: string,
  style: RichTextStyle = {},
): RichTextElement[] {
  const re = /(\*([^*]+)\*|_([^_]+)_|~([^~]+)~|`([^`]+)`|:([a-zA-Z0-9_+-]+):)/g;
  const out: RichTextElement[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text))) {
    if (m.index > last)
      out.push({ type: "text", text: text.slice(last, m.index), style });

    if (m[2] !== undefined)
      out.push(...parseInlineMarkdown(m[2], { ...style, bold: true }));
    else if (m[3] !== undefined)
      out.push(...parseInlineMarkdown(m[3], { ...style, italic: true }));
    else if (m[4] !== undefined)
      out.push(...parseInlineMarkdown(m[4], { ...style, strike: true }));
    else if (m[5] !== undefined)
      out.push({ type: "text", text: m[5], style: { ...style, code: true } });
    else if (m[6] !== undefined) out.push({ type: "emoji", name: m[6] });

    last = re.lastIndex;
  }

  if (last < text.length)
    out.push({ type: "text", text: text.slice(last), style });

  return out;
}

export default function SlackText(props: {
  text: TextObject;
  inline?: boolean;
}) {
  const innerElements: RichTextElement[] =
    props.text.type === "mrkdwn"
      ? parseMrkdwn(props.text.text)
      : props.text.emoji
        ? parseInlineMarkdown(props.text.text)
        : [{ type: "text", text: props.text.text }];

  const section: RichTextSubElement = {
    type: "rich_text_section",
    elements: innerElements,
  };

  const mainElement: RichTextSubElement[] = [section];

  return (
    <RichTextBlock
      block={{
        elements: mainElement,
      }}
    />
  );
}
