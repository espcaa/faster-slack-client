import { File } from "../../../bindings/fastslack/shared";
import styles from "./ImageComponent.module.css";

const MAX_W = 360;
const MAX_H = 480;

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

  const getNaturalDims = (f: File): { w: number; h: number } | null => {
    if (f.original_w && f.original_h) return { w: f.original_w, h: f.original_h };
    if (f.thumb_1024_w && f.thumb_1024_h) return { w: f.thumb_1024_w, h: f.thumb_1024_h };
    if (f.thumb_960_w && f.thumb_960_h) return { w: f.thumb_960_w, h: f.thumb_960_h };
    if (f.thumb_800_w && f.thumb_800_h) return { w: f.thumb_800_w, h: f.thumb_800_h };
    if (f.thumb_720_w && f.thumb_720_h) return { w: f.thumb_720_w, h: f.thumb_720_h };
    if (f.thumb_480_w && f.thumb_480_h) return { w: f.thumb_480_w, h: f.thumb_480_h };
    if (f.thumb_360_w && f.thumb_360_h) return { w: f.thumb_360_w, h: f.thumb_360_h };
    return null;
  };

  const highResUrl = getBestThumbnail(file);
  const dims = getNaturalDims(file);

  let displayW: number | null = null;
  let displayH: number | null = null;
  if (dims) {
    const scale = Math.min(MAX_W / dims.w, MAX_H / dims.h, 1);
    displayW = Math.round(dims.w * scale);
    displayH = Math.round(dims.h * scale);
  }

  const tinyPlaceholder = file.thumb_tiny;

  return (
    <div
      class={styles.imageWrapper}
      style={
        displayW && displayH
          ? { width: `${displayW}px`, height: `${displayH}px` }
          : { "aspect-ratio": "16 / 9", width: `${MAX_W}px` }
      }
    >
      {tinyPlaceholder && (
        <img
          src={`data:image/png;base64,${tinyPlaceholder}`}
          alt=""
          aria-hidden="true"
          class={styles.placeholder}
        />
      )}
      <img
        src={`/proxy/file?url=${encodeURIComponent(highResUrl!)}`}
        alt={file.name}
        loading="lazy"
        width={displayW ?? undefined}
        height={displayH ?? undefined}
        class={styles.image}
        onLoad={(e) => {
          (e.currentTarget as HTMLImageElement).style.opacity = "1";
        }}
      />
    </div>
  );
}
