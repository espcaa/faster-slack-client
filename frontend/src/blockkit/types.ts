export type TextObject = {
  type: "mrkdwn" | "plain_text";
  text: string;
  emoji?: boolean;
  verbatim?: boolean;
};

export type Option = {
  text: TextObject;
  value?: string;
  description?: TextObject;
  url?: string;
};

export type ButtonElement = {
  type: "button";
  text: TextObject;
  action_id?: string;
  url?: string;
  value?: string;
  style?: "primary" | "danger";
};

export type ImageElement = {
  type: "image";
  image_url?: string;
  slack_file?: { id?: string; url?: string };
  alt_text: string;
};

export type OverflowElement = {
  type: "overflow";
  action_id?: string;
  options: Option[];
};

export type UnknownElement = { type: string; [key: string]: any };

export type BlockElement =
  | ButtonElement
  | ImageElement
  | OverflowElement
  | UnknownElement;

export type SectionBlock = {
  type: "section";
  block_id?: string;
  text?: TextObject;
  fields?: TextObject[];
  accessory?: BlockElement;
};

export type ActionsBlock = {
  type: "actions";
  block_id?: string;
  elements: BlockElement[];
};

export type ContextBlock = {
  type: "context";
  block_id?: string;
  elements: (TextObject | ImageElement)[];
};

export type DividerBlock = { type: "divider"; block_id?: string };

export type HeaderBlock = {
  type: "header";
  block_id?: string;
  text: TextObject;
};

export type ImageBlock = {
  type: "image";
  block_id?: string;
  image_url?: string;
  slack_file?: { id?: string; url?: string };
  alt_text: string;
  title?: TextObject;
};

export type RichTextBlock = {
  type: "rich_text";
  block_id?: string;
  elements: any[];
};

export type UnknownBlock = {
  type: string;
  block_id?: string;
  [key: string]: any;
};

export type Block =
  | SectionBlock
  | ActionsBlock
  | ContextBlock
  | DividerBlock
  | HeaderBlock
  | ImageBlock
  | RichTextBlock
  | UnknownBlock;

export type RichTextStyle = {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
  underline?: boolean;
  highlight?: boolean;
};

export type RichTextElement =
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
      range: "here" | "channel";
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

export type RichTextSubElement =
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
