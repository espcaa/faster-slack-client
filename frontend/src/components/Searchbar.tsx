import {
  createSignal,
  onMount,
  onCleanup,
  Show,
  For,
  createEffect,
} from "solid-js";
import { Portal } from "solid-js/web";
import styles from "./SearchBar.module.css";
import { SearchResult } from "../../bindings/fastslack/shared";
import { QuickUserChannelSearch } from "../../bindings/fastslack/slackservice";
import { useAuth } from "../AuthContext";
import SlickScrollbar from "./misc/Scrollbar";
import { setChatStore } from "../ChatStore";

interface Props {
  onSelectChannel: (channelID: string) => void;
}

export default function SearchBar(props: Props) {
  const [visible, setVisible] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal<SearchResult[]>([]);
  const { workspace } = useAuth();
  const [indexSelected, setIndexSelected] = createSignal(-1);
  let InputRef: HTMLInputElement | undefined;
  let resultsRef: HTMLDivElement | undefined;

  function cleanUp() {
    setVisible(false);
    setQuery("");
    setResults([]);
    setIndexSelected(-1);
  }

  function selectResult(idx: number) {
    const r = results()[idx];
    if (!r) return;
    setChatStore({ threadTS: null, threadParent: null });
    props.onSelectChannel(r.ChannelID);
    cleanUp();
  }

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (visible()) {
          cleanUp();
        } else {
          setVisible(true);
        }
      }
      if (!visible()) return;
      if (e.key === "Escape") {
        cleanUp();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndexSelected((i) => Math.min(i + 1, results().length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndexSelected((i) => Math.max(i - 1, -1));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const idx = indexSelected();
        selectResult(idx === -1 ? 0 : idx);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  });

  createEffect(() => {
    const len = results().length;
    if (len === 0) {
      setIndexSelected(-1);
    } else if (indexSelected() >= len) {
      setIndexSelected(len - 1);
    }
  });

  createEffect(() => {
    const idx = indexSelected();
    if (idx < 0 || !resultsRef) return;
    const item = resultsRef.children[idx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  });

  // focus input when search bar becomes visible
  createEffect(() => {
    if (visible() && InputRef) {
      InputRef.focus();
    }
  });

  return (
    <Show when={visible()}>
      <Portal>
        <div class={styles.backdrop} onClick={() => cleanUp()} />
        <div class={styles.searchbar}>
          <input
            type="text"
            placeholder="Search..."
            spellcheck={false}
            autocorrect="off"
            autoCapitalize="off"
            autocomplete="off"
            class={styles.input}
            ref={InputRef}
            value={query()}
            onInput={async (e) => {
              const val = e.currentTarget.value.trim();
              setQuery(val);

              if (val === "") {
                setResults([]);
                return;
              }

              try {
                const data = await QuickUserChannelSearch(
                  workspace() || "",
                  val,
                );
                setResults(data);
              } catch (err) {
                console.error("Search failed:", err);
                setResults([]);
              }
            }}
          />

          <Show when={results().length > 0 && query() !== ""}>
            <div class={styles.resultsWrapper}>
              <div class={styles.results} ref={resultsRef}>
                <For each={results()}>
                  {(result, index) => (
                    <div
                      class={styles.resultItem}
                      classList={{
                        [styles.selected]: index() === indexSelected(),
                        [styles.preSelected]:
                          indexSelected() === -1 && index() === 0,
                      }}
                      onMouseEnter={() => setIndexSelected(index())}
                      onMouseLeave={() => setIndexSelected(-1)}
                      onClick={() => selectResult(index())}
                    >
                      <div class={styles.resultInfo}>
                        <span class={styles.resultName}>{result.Name}</span>
                      </div>
                      <Show when={indexSelected() === -1 && index() === 0}>
                        <div class={styles.hintContainer}>
                          <span class={styles.hint}>Enter</span>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
              <SlickScrollbar container={resultsRef} />
            </div>
          </Show>
        </div>
      </Portal>
    </Show>
  );
}
