import { Events } from "@wailsio/runtime";
import { Message } from "../../bindings/fastslack/shared";
import { addMessages, removeMessage, updateMessageContent } from "./ChatStore";

let started = false;

const parseEvent = (event: any): any => {
  const data = event?.data;
  if (data == null) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
};

export const startRTMSync = () => {
  if (started) return;
  started = true;

  Events.On("slack:message", (event: any) => {
    const raw = parseEvent(event);
    if (!raw || !raw.channel || !raw.ts) return;

    const msg = Message.createFrom(raw);
    addMessages(raw.channel, [msg]);
  });

  Events.On("slack:message_changed", (event: any) => {
    const raw = parseEvent(event);
    if (!raw || !raw.channel || !raw.message || !raw.message.ts) return;

    const updated = Message.createFrom(raw.message);
    updateMessageContent(raw.channel, updated.ts, updated);
  });

  Events.On("slack:message_deleted", (event: any) => {
    const raw = parseEvent(event);
    if (!raw || !raw.channel || !raw.deleted_ts) return;

    removeMessage(raw.channel, raw.deleted_ts);
  });
};
