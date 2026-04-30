import { createEffect } from "solid-js";
import { Theme } from "../../../bindings/fastslack/store";
import { applyTheme } from "../../utils/applyTheme";
import styles from "./ThemeDemo.module.css";

export default function ThemeDemo(props: { theme: Theme; dark?: boolean }) {
  let el!: HTMLDivElement;
  createEffect(() => applyTheme(props.theme, !!props.dark, el));

  // Avatar palette cycles through theme colors so each preview line
  // uses a different themed blob.
  const avatarColors = [
    "var(--c1-red)",
    "var(--c2-green)",
    "var(--c4-blue)",
    "var(--c5-magenta)",
  ];

  const messages = [
    {
      usernameWidth: 52,
      lines: [
        [
          { width: 70 },
          { width: 30, kind: "link" as const },
          { width: 40 },
        ],
        [{ width: 110 }, { emoji: true as const }],
      ],
    },
    {
      usernameWidth: 64,
      lines: [
        [{ width: 40, kind: "mention" as const }, { width: 90 }],
      ],
    },
    {
      usernameWidth: 44,
      lines: [
        [{ width: 60 }, { width: 80 }, { width: 24, kind: "accent" as const }],
        [{ width: 50 }],
      ],
    },
  ];

  return (
    <div ref={el!} class={styles.preview}>
      <div class={styles.header}>
        <span class={styles.hash}>#</span>
        <div class={styles.channelName} />
      </div>

      <div class={styles.body}>
        {messages.map((m, i) => (
          <div class={styles.message}>
            <div
              class={styles.avatar}
              style={{ background: avatarColors[i % avatarColors.length] }}
            />
            <div class={styles.lines}>
              <div class={styles.metaRow}>
                <div
                  class={styles.username}
                  style={{ width: `${m.usernameWidth}px` }}
                />
                <div class={styles.timestamp} />
              </div>
              {m.lines.map((row) => (
                <div class={styles.textRow}>
                  {row.map((b) =>
                    "emoji" in b ? (
                      <div class={styles.emoji} />
                    ) : (
                      <div
                        class={`${styles.blob} ${
                          b.kind === "link"
                            ? styles.link
                            : b.kind === "accent"
                              ? styles.accent
                              : b.kind === "mention"
                                ? styles.mention
                                : ""
                        }`}
                        style={{ width: `${b.width}px` }}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div class={styles.input} />
    </div>
  );
}
