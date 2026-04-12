import { createSignal, JSX, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";
import UserProfileCard from "../UserProfileCard";
import { UserProfile } from "../../../bindings/fastslack/shared";

export default function UserProfileCardTrigger(props: {
  profile: UserProfile;
  workspaceID: string;
  children: JSX.Element;
}) {
  let containerRef: HTMLSpanElement | undefined;
  let openTimeout: number;
  let closeTimeout: number;

  const [showCard, setShowCard] = createSignal(false);
  const [pos, setPos] = createSignal({ top: 0, left: 0 });

  const cancelClose = () => window.clearTimeout(closeTimeout);

  const scheduleClose = () => {
    window.clearTimeout(openTimeout);
    cancelClose();
    closeTimeout = window.setTimeout(() => setShowCard(false), 300);
  };

  const handleMouseEnter = () => {
    cancelClose();
    if (!containerRef) return;

    const rect = containerRef.getBoundingClientRect();
    setPos({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });

    openTimeout = window.setTimeout(() => setShowCard(true), 400);
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
      {props.children}

      <Show when={showCard()}>
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
            }}
          >
            <UserProfileCard
              profile={props.profile}
              workspaceID={props.workspaceID}
            />
          </div>
        </Portal>
      </Show>
    </span>
  );
}
