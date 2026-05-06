import { MdRoundDownload } from "solid-icons/md";
import { File } from "../../../bindings/fastslack/shared";
import { DownloadFile } from "../../../bindings/fastslack/slackservice";
import styles from "./ImageComponent.module.css";
import { decodeThumbTiny } from "../../../utils/thumb";
import Actions, { Action } from "../Actions";

const MAX_W = 360;
const MAX_H = 480;

// URLs we've already fully loaded at least once in this session. Used to
// avoid showing the blurry placeholder + fade-in every time virtua remounts
// an item during scroll.
const loadedUrls = new Set<string>();

export default function ImageComponent(props: {
  file: File;
  gallery?: File[];
  galleryIndex?: number;
}) {
  const file = props.file;
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

  const handleDownload = async () => {
    if (!file.url_private) return;
    try {
      const path = await DownloadFile(
        file.url_private,
        file.name || "download",
      );
      console.log("Downloaded to", path);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const getNaturalDims = (f: File): { w: number; h: number } | null => {
    if (f.original_w && f.original_h)
      return { w: f.original_w, h: f.original_h };
    if (f.thumb_1024_w && f.thumb_1024_h)
      return { w: f.thumb_1024_w, h: f.thumb_1024_h };
    if (f.thumb_960_w && f.thumb_960_h)
      return { w: f.thumb_960_w, h: f.thumb_960_h };
    if (f.thumb_800_w && f.thumb_800_h)
      return { w: f.thumb_800_w, h: f.thumb_800_h };
    if (f.thumb_720_w && f.thumb_720_h)
      return { w: f.thumb_720_w, h: f.thumb_720_h };
    if (f.thumb_480_w && f.thumb_480_h)
      return { w: f.thumb_480_w, h: f.thumb_480_h };
    if (f.thumb_360_w && f.thumb_360_h)
      return { w: f.thumb_360_w, h: f.thumb_360_h };
    return null;
  };

  const highResUrl = getBestThumbnail(file);
  const proxiedUrl = `/proxy/file?url=${encodeURIComponent(highResUrl!)}`;
  const alreadyLoaded = loadedUrls.has(proxiedUrl);
  const dims = getNaturalDims(file);

  let displayW: number | null = null;
  let displayH: number | null = null;
  if (dims) {
    const scale = Math.min(MAX_W / dims.w, MAX_H / dims.h, 1);
    displayW = Math.round(dims.w * scale);
    displayH = Math.round(dims.h * scale);
  }

  const tinyPlaceholder = file.thumb_tiny;

  const downloadAction: Action = {
    icon: <MdRoundDownload size={20} />,
    text: "Download",
    onClick: handleDownload,
  };

  return (
    <div
      class={styles.imageWrapper}
      style={
        displayW && displayH
          ? { width: `${displayW}px`, height: `${displayH}px` }
          : { "aspect-ratio": "16 / 9", width: `${MAX_W}px` }
      }
    >
      <div class={styles.imageActions}>
        <Actions actions={[downloadAction]} />
      </div>
      {tinyPlaceholder && !alreadyLoaded && (
        <img
          src={decodeThumbTiny(tinyPlaceholder).dataUrl}
          alt=""
          aria-hidden="true"
          class={styles.placeholder}
        />
      )}
      <img
        src={proxiedUrl}
        alt={file.name}
        loading="lazy"
        width={displayW ?? undefined}
        height={displayH ?? undefined}
        class={styles.image}
        style={
          alreadyLoaded ? { opacity: 1, transition: "none" } : undefined
        }
        onLoad={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          img.style.opacity = "1";
          loadedUrls.add(proxiedUrl);
        }}
      />
    </div>
  );
}
