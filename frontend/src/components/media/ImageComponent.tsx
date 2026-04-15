import { File } from "../../../bindings/fastslack/shared";
import styles from "./ImageComponent.module.css";

export default function ImageComponent({ file }: { file: File }) {
  const getBestThumbnail = (f: File) => {
    return (
      f.thumb_1024 ||
      f.thumb_960 ||
      f.thumb_800 ||
      f.thumb_720 ||
      f.thumb_480 ||
      f.thumb_360 ||
      f.url_private
    );
  };

  const highResUrl = getBestThumbnail(file);

  const getAspectRatio = (f: File): string => {
    if (f.thumb_360_w && f.thumb_360_h) return `${f.thumb_360_w} / ${f.thumb_360_h}`;
    if (f.original_w && f.original_h) return `${f.original_w} / ${f.original_h}`;
    return "16 / 9";
  };

  const aspectRatio = getAspectRatio(file);

  return (
    <div
      class={styles.imageWrapper}
      style={{ "aspect-ratio": aspectRatio }}
    >
      <img
        src={`/proxy/file?url=${encodeURIComponent(highResUrl!)}`}
        alt={file.name}
        loading="lazy"
        class={styles.image}
        onLoad={(e) => {
          (e.currentTarget as HTMLImageElement).style.opacity = "1";
        }}
      />
    </div>
  );
}
