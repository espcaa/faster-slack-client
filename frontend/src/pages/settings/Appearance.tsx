import { For, Show } from "solid-js";
import { useSettings } from "../../SettingsContext";
import { OpenThemesDir } from "../../../bindings/fastslack/themeservice";
import Radio from "../../components/ui/Radio";

import style from "./Appearance.module.css";
import {
  MdFillBedtime,
  MdFillComputer,
  MdRoundOpen_in_full,
  MdRoundRefresh,
  MdRoundWb_sunny,
} from "solid-icons/md";
import SettingsSection from "./Section";
import ThemeDemo from "../../components/misc/ThemeDemo";

export default function AppearanceSettings() {
  const { settings, themes, update, ready, reloadThemes, invalidThemes } =
    useSettings();

  return (
    <Show when={ready()}>
      <SettingsSection
        title="Theme"
        description="select your favourite custom theme!"
      >
        <div
          style={{
            display: "flex",
            "flex-direction": "row",
            "align-items": "center",
            gap: "8px",
            "margin-bottom": "8px",
          }}
        >
          <button onClick={() => OpenThemesDir()} class={style.iconButton}>
            <MdRoundOpen_in_full size={16} />
            Open themes directory
          </button>

          <button onClick={() => reloadThemes()} class={style.iconButton}>
            <MdRoundRefresh size={16} />
            Refresh
          </button>
        </div>
        <div class={style.gridThemesContainer}>
          <For each={themes()}>
            {(t) => (
              <div
                class={style.themeOption}
                classList={{ [style.selected]: settings()!.themeId === t.id }}
                onClick={() => update({ themeId: t.id })}
              >
                <ThemeDemo
                  theme={t}
                  dark={
                    settings()!.mode === "dark" ||
                    (settings()!.mode === "system" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches)
                  }
                />
                <p class={style.themeName}>{t.name}</p>
              </div>
            )}
          </For>
        </div>
        <For each={invalidThemes()}>
          {(t) => (
            <div style={{ color: "red" }}>
              Theme "{t.path}" is invalid and cannot be applied. Please fix or
              remove it. Error: {t.reason}
            </div>
          )}
        </For>
      </SettingsSection>
      <SettingsSection title="Color mode">
        <Radio
          options={[
            {
              text: "System",
              value: "system",
              icon: <MdFillComputer size={16} />,
            },
            {
              text: "Light",
              value: "light",
              icon: <MdRoundWb_sunny size={16} />,
            },
            {
              text: "Dark",
              value: "dark",
              icon: <MdFillBedtime size={16} />,
            },
          ]}
          name="mode"
          selectedValue={settings()!.mode}
          onChange={(value) => update({ mode: value })}
        />
      </SettingsSection>
    </Show>
  );
}
