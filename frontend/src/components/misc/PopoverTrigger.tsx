import { createSignal, JSX, mergeProps, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";

export default function Popover(props: {
  content: JSX.Element;
  children: JSX.Element;
  openDelay?: number;
  closeDelay?: number;
  offset?: number;
}) {
  const merged = mergeProps(
    { openDelay: 400, closeDelay: 300, offset: 8 },
    props,
  );

  let containerRef: HTMLSpanElement | undefined;
  let openTimeout: number;
  let closeTimeout: number;

  const [show, setShow] = createSignal(false);
  const [pos, setPos] = createSignal({ top: 0, left: 0 });

  const cancelClose = () => window.clearTimeout(closeTimeout);

  const scheduleClose = () => {
    window.clearTimeout(openTimeout);
    cancelClose();
    closeTimeout = window.setTimeout(() => setShow(false), merged.closeDelay);
  };

  const handleMouseEnter = () => {
    cancelClose();
    if (!containerRef) return;

    const rect = containerRef.getBoundingClientRect();
    setPos({
      top: rect.top - merged.offset,
      left: rect.left + rect.width / 2,
    });

    openTimeout = window.setTimeout(() => setShow(true), merged.openDelay);
  };

  onCleanup(() => {
    window.clearTimeout(openTimeout);
    window.clearTimeout(closeTimeout);
  });

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={scheduleClose}
      style={{ display: "inline-block", cursor: "pointer" }}
    >
      {merged.children}

      <Show when={show()}>
        <Portal>
          <div
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            style={{
              position: "fixed",
              "z-index": 1000,
              top: `${pos().top}px`,
              left: `${pos().left}px`,
              transform: "translate(-50%, -100%)",
              "pointer-events": "auto", // Ensure user can hover the card
            }}
          >
            {merged.content}
          </div>
        </Portal>
      </Show>
    </span>
  );
}
