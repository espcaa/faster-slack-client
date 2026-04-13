import { createSignal, onCleanup, onMount } from "solid-js";
import styles from "./Scrollbar.module.css";

interface Props {
  container?: HTMLDivElement | null;
  /** Track width in px (default 6) */
  trackWidth?: number;
  /** Thumb background color — overrides CSS variable */
  thumbColor?: string;
  /** Track inset from edges in px (default 5) */
  trackInset?: number;
  /** Track offset from right edge in px (default 4) */
  trackRight?: number;
  /** Minimum thumb height in px (default 30) */
  minThumbHeight?: number;
  /** If true the scrollbar shows for a column-reverse container */
  reversed?: boolean;
}

export default function Scrollbar(props: Props) {
  let thumbRef!: HTMLDivElement;
  let trackRef!: HTMLDivElement;
  let hideTimer: ReturnType<typeof setTimeout>;
  const [visible, setVisible] = createSignal(false);
  const [scrollable, setScrollable] = createSignal(false);

  const minThumb = () => props.minThumbHeight ?? 30;

  const update = () => {
    const el = props.container;
    const thumb = thumbRef;
    if (!el || !thumb) return;

    const { scrollTop, scrollHeight, clientHeight } = el;

    if (scrollHeight <= clientHeight) {
      setScrollable(false);
      return;
    }

    setScrollable(true);

    const ratio = clientHeight / scrollHeight;
    const thumbHeight = Math.max(ratio * clientHeight, minThumb());
    thumb.style.height = `${thumbHeight}px`;

    const scrollableDist = scrollHeight - clientHeight;
    const pad = (props.trackInset ?? 5) * 2;

    if (props.reversed) {
      const scrollPercent = Math.abs(scrollTop) / scrollableDist;
      const translateY = (1 - scrollPercent) * (clientHeight - thumbHeight - pad);
      thumb.style.transform = `translateY(${translateY}px)`;
    } else {
      const scrollPercent = scrollTop / scrollableDist;
      const translateY = scrollPercent * (clientHeight - thumbHeight - pad);
      thumb.style.transform = `translateY(${translateY}px)`;
    }
  };

  const show = () => {
    setVisible(true);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => setVisible(false), 1200);
  };

  const onScroll = () => {
    update();
    show();
  };

  onMount(() => {
    const el = props.container;
    if (!el) return;

    const onEnter = () => { update(); show(); };

    el.addEventListener("scroll", onScroll);
    el.addEventListener("mouseenter", onEnter);
    window.addEventListener("resize", update);

    const resizeObs = new ResizeObserver(update);
    resizeObs.observe(el);

    // Watch for child additions/removals so we recalc after async content loads
    const mutObs = new MutationObserver(update);
    mutObs.observe(el, { childList: true, subtree: true });

    update();

    onCleanup(() => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("resize", update);
      resizeObs.disconnect();
      mutObs.disconnect();
      clearTimeout(hideTimer);
    });
  });

  const onThumbDown = (e: MouseEvent) => {
    e.preventDefault();
    const el = props.container;
    if (!el) return;

    const startY = e.clientY;
    const startScroll = el.scrollTop;
    const { scrollHeight, clientHeight } = el;
    const pad = (props.trackInset ?? 5) * 2;
    const thumbHeight = Math.max((clientHeight / scrollHeight) * clientHeight, minThumb());
    const trackRange = clientHeight - thumbHeight - pad;
    const scrollRange = scrollHeight - clientHeight;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      const scrollDelta = (delta / trackRange) * scrollRange;
      el.scrollTop = startScroll + scrollDelta;
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const trackStyle = () => {
    const s: Record<string, string> = {};
    if (props.trackWidth != null) s.width = `${props.trackWidth}px`;
    if (props.trackInset != null) {
      s.top = `${props.trackInset}px`;
      s.bottom = `${props.trackInset}px`;
    }
    if (props.trackRight != null) s.right = `${props.trackRight}px`;
    return s;
  };

  const thumbStyle = () => {
    const s: Record<string, string> = {};
    if (props.thumbColor) s.background = props.thumbColor;
    return s;
  };

  return (
    <div
      ref={trackRef}
      class={`${styles.track} ${visible() && scrollable() ? styles.visible : ""}`}
      style={trackStyle()}
    >
      <div ref={thumbRef} class={styles.thumb} style={thumbStyle()} onMouseDown={onThumbDown} />
    </div>
  );
}
