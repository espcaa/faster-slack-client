import styles from "./Mention.module.css";

function Mention(props: { text: string }) {
  return (
    <span class={styles.userChip}>
      <span class={styles.name}>{props.text}</span>
    </span>
  );
}

export default Mention;
