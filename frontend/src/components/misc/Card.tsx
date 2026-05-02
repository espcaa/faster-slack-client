import styles from "./Card.module.css";

export default function Card(props: { children: any }) {
  return <div class={styles.card}>{props.children}</div>;
}
