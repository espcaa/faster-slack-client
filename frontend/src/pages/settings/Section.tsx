import style from "./Section.module.css";

export default function SettingsSection(props: {
  title: string;
  description?: string;
  children: any;
}) {
  return (
    <div class={style.section}>
      <div class={style.header}>
        <h3 class={style.title}>{props.title}</h3>
        {props.description && (
          <p class={style.description}>{props.description}</p>
        )}
      </div>
      {props.children}
    </div>
  );
}
