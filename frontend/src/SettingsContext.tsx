import {
  createContext,
  createSignal,
  onMount,
  ParentProps,
  useContext,
} from "solid-js";
import { InvalidTheme, Settings, Theme } from "../bindings/fastslack/store";

import {
  GetSettings,
  UpdateSettings,
} from "../bindings/fastslack/settingsservice";
import {
  ListThemes,
  GetTheme,
  ReloadThemes as ReloadThemesBackend,
  ListInvalidThemes,
} from "../bindings/fastslack/themeservice";

import { Events } from "@wailsio/runtime";
import { applyTheme } from "./utils/applyTheme";

const [settings, setSettings] = createSignal<Settings | null>(null);
const [themes, setThemes] = createSignal<Theme[]>([]);
const [ready, setReady] = createSignal(false);
const [invalidThemes, setInvalidThemes] = createSignal<InvalidTheme[]>([]);
async function update(patch: Partial<Settings>) {
  const next = { ...settings()!, ...patch };
  setSettings(next);
  await UpdateSettings(next);
}

async function reloadThemes() {
  await ReloadThemesBackend();
  const ts = await ListThemes();
  const invalid = await ListInvalidThemes();
  setInvalidThemes(invalid);
  setThemes(ts);
  await reapply();
}

// overlay state
const [open, setOpen] = createSignal(false);
export const openSettings = () => setOpen(true);
export const closeSettings = () => setOpen(false);

const mql = window.matchMedia("(prefers-color-scheme: dark)");
mql.addEventListener("change", () => reapply());

async function reapply() {
  const s = settings();
  if (!s) return;
  const dark = s.mode === "dark" || (s.mode === "system" && mql.matches);
  let theme: Theme | null = null;
  try {
    theme = await GetTheme(s.themeId);
  } catch {
    theme = null;
  }
  if (!theme) {
    const ts = themes();
    const fallback = ts.find((t) => t.id === "rose-pine") ?? ts[0];
    if (!fallback) return;
    console.warn(
      `theme "${s.themeId}" not found, falling back to "${fallback.id}"`,
    );
    theme = fallback;
    await update({ themeId: fallback.id });
  }
  applyTheme(theme, dark);
}

Events.On("settings:changed", (e) => {
  const next = e.data as Settings;
  setSettings(next);
  reapply();
});

const SettingsContext = createContext({
  settings,
  themes,
  invalidThemes,
  ready,
  update,
  reloadThemes,
  open,
  openSettings,
  closeSettings,
});

export function SettingsProvider(props: ParentProps) {
  onMount(async () => {
    const [s, ts, invalid] = await Promise.all([
      GetSettings(),
      ListThemes(),
      ListInvalidThemes(),
    ]);
    setInvalidThemes(invalid);
    setSettings(s);
    setThemes(ts);
    await reapply();
    setReady(true);
  });
  return (
    <SettingsContext.Provider
      value={{
        invalidThemes,
        settings,
        themes,
        ready,
        update,
        reloadThemes,
        open,
        openSettings,
        closeSettings,
      }}
    >
      {props.children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
