import styles from "./DateDivider.module.css";

export function isDifferentDay(ts1: string, ts2: string): boolean {
  const d1 = new Date(parseFloat(ts1) * 1000);
  const d2 = new Date(parseFloat(ts2) * 1000);
  return (
    d1.getFullYear() !== d2.getFullYear() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getDate() !== d2.getDate()
  );
}

function formatDateDivider(ts: string): string {
  const date = new Date(parseFloat(ts) * 1000);
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function DateDivider(props: { ts: string }) {
  return (
    <div class={styles.dateDivider}>
      <div class={styles.line} />
      <span class={styles.label}>{formatDateDivider(props.ts)}</span>
      <div class={styles.line} />
    </div>
  );
}
