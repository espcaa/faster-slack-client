import styles from "./AttachmentCard.module.css";
import Card from "../misc/Card";
import { File } from "../../../bindings/fastslack/shared";
import { Switch, Match, Show, JSX } from "solid-js";
import { MdRoundDownload, MdRoundPicture_as_pdf } from "solid-icons/md";
import Actions, { Action } from "../Actions";
import { DownloadFile } from "../../../bindings/fastslack/slackservice";

export default function AttachmentCard(props: { file: File }) {
  const handleDownload = async () => {
    if (!props.file.url_private) return;
    try {
      const path = await DownloadFile(
        props.file.url_private,
        props.file.name || "download",
      );
      console.log("Downloaded to", path);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <Card>
      <Switch>
        <Match when={props.file.mimetype == "application/pdf"}>
          <AttachmentView
            name={props.file.name || "unknown.pdf"}
            type="PDF"
            icon={<MdRoundPicture_as_pdf size={32} color="#E53E3E" />}
            actions={[
              {
                text: "Download PDF",
                onClick: () => {
                  handleDownload();
                },
                icon: <MdRoundDownload size={20} />,
              },
            ]}
          />
        </Match>
      </Switch>
    </Card>
  );
}

export function AttachmentView(props: {
  name: string;
  type: string;
  icon?: JSX.Element;
  actions?: Action[];
}) {
  return (
    <div class={styles.attachmentView}>
      <Show when={props.icon}>
        <div class={styles.iconWrapper}>
          <span class={styles.icon}>{props.icon}</span>
        </div>
      </Show>
      <div class={styles.info}>
        <span class={styles.name}>{props.name}</span>
        <span class={styles.type}>{props.type}</span>
      </div>
      <div class={styles.actions}>
        <Actions actions={props.actions || []} />
      </div>
    </div>
  );
}
