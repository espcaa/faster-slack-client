import { Portal } from "solid-js/web";
import { Show, onCleanup, onMount } from "solid-js";
import { useSettings } from "../SettingsContext";
import Settings from "../pages/Settings";
import styles from "./SettingsOverlay.module.css";

export default function SettingsOverlay() {
  const { open, closeSettings } = useSettings();

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSettings();
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        if (open()) {
          closeSettings();
          return;
        }
        e.preventDefault();
        useSettings().openSettings();
      }
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  return (
    <Show when={open()}>
      <Portal>
        <div class={styles.backdrop} onClick={closeSettings}>
          <div
            class={styles.settingsPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <Settings />
          </div>
        </div>
      </Portal>
    </Show>
  );
}
