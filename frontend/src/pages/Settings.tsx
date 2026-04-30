import { createSignal, JSXElement } from "solid-js";
import styles from "./Settings.module.css";
import AppearanceSettings from "./settings/Appearance";
import { useSettings } from "../SettingsContext";
import {
  MdRoundBrush,
  MdRoundClose,
  MdRoundNotifications,
  MdRoundSettings,
} from "solid-icons/md";
import Scrollbar from "../components/misc/Scrollbar";

type Tab = {
  id: string;
  label: string;
  content: JSXElement;
  icon: JSXElement;
};

export default function Settings() {
  const tabs = [
    {
      id: "general",
      label: "General",
      content: <div>Nothing here (yet).</div>,
      icon: <MdRoundSettings size={16} />,
    },
    {
      id: "notifications",
      label: "Notifications",
      content: <div>Nothing here (yet).</div>,
      icon: <MdRoundNotifications size={16} />,
    },
    {
      id: "appearance",
      label: "Appearance",
      content: <AppearanceSettings />,
      icon: <MdRoundBrush size={16} />,
    },
  ] as Tab[];

  const [activeTab, setActiveTab] = createSignal(tabs[0].id);

  let containerRef!: HTMLDivElement;

  return (
    <div class={styles.settingsContainer}>
      <div class={styles.tab}>
        <h2 class={styles.title}>Settings</h2>
        {tabs.map((tab) => (
          <button
            class={styles.tabButton}
            onClick={() => setActiveTab(tab.id)}
            classList={{ [styles.activeTab]: activeTab() === tab.id }}
          >
            <span class={styles.tabIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      <div class={styles.contentWrapper}>
        <div class={styles.content} ref={containerRef}>
          <div
            class={styles.closeButtonContainer}
            onClick={() => useSettings().closeSettings()}
          >
            <button class={styles.closeButton}>
              <MdRoundClose size={24} class={styles.closeIcon} />
            </button>
          </div>
          {tabs.find((tab) => tab.id === activeTab())?.content}
        </div>
        <Scrollbar container={containerRef} />
      </div>
    </div>
  );
}
