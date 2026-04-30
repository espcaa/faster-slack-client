import { JSXElement } from "solid-js";
import styles from "./Radio.module.css";

export default function Radio(props: {
  options: { text: string; value: string; icon?: JSXElement }[];
  name: string;
  selectedValue: string;
  onChange: (value: string) => void;
}) {
  return (
    <div class={styles.radioGroup}>
      {props.options.map((opt, index) => (
        <button
          class={styles.radioOption}
          onClick={() => props.onChange(opt.value)}
          classList={{
            [styles.first]: index === 0,
            [styles.last]: index === props.options.length - 1,
            [styles.selected]: opt.value === props.selectedValue,
          }}
        >
          {opt.icon && <span class={styles.icon}>{opt.icon}</span>}
          {opt.text}
        </button>
      ))}
    </div>
  );
}
