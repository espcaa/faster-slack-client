import { Show } from "solid-js";
import { File } from "../../bindings/fastslack/shared";
import ImageComponent from "./media/ImageComponent";

export default function FileContainer(props: { files: File[] }) {
  return (
    <div style={{ "margin-top": "8px" }}>
      {props.files.map((file) => (
        <div>
          <p>
            DEBUG:
            {file.name}
            {file.mimetype}
            {file.size && <span>({(file.size / 1024).toFixed(1)} KB)</span>}
          </p>
          <Show when={file.mimetype.startsWith("image/")}>
            <ImageComponent file={file} />
          </Show>
        </div>
      ))}
    </div>
  );
}
