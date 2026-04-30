import type { Theme } from "../../bindings/fastslack/store";

const KEYS = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightMagenta",
  "brightCyan",
  "brightWhite",
] as const;

const VAR_NAMES = [
  "--c0-black",
  "--c1-red",
  "--c2-green",
  "--c3-yellow",
  "--c4-blue",
  "--c5-magenta",
  "--c6-cyan",
  "--c7-white",
  "--c8-bright-black",
  "--c9-bright-red",
  "--c10-bright-green",
  "--c11-bright-yellow",
  "--c12-bright-blue",
  "--c13-bright-magenta",
  "--c14-bright-cyan",
  "--c15-bright-white",
] as const;

export function applyTheme(
  theme: Theme,
  dark: boolean,
  target: HTMLElement = document.documentElement,
) {
  const palette = dark ? theme.dark : theme.light;
  KEYS.forEach((k, i) =>
    target.style.setProperty(VAR_NAMES[i], (palette as any)[k]),
  );
  target.dataset.theme = dark ? "dark" : "light";
}
