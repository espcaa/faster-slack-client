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

export type UnknownBlock = { type: string; block_id?: string; [key: string]: any };

export type Block =
  | SectionBlock
  | ActionsBlock
  | ContextBlock
  | DividerBlock
  | HeaderBlock
  | ImageBlock
  | RichTextBlock
  | UnknownBlock;
