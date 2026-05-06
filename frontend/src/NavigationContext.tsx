import { createSignal, createContext, useContext, ParentProps } from "solid-js";
import { chatStore, setChatStore } from "./ChatStore";

const [selectedChannel, setSelectedChannel] = createSignal<string | null>(null);

function selectChannel(id: string) {
  setSelectedChannel(id);
  if (chatStore.openThreads[id]) {
    setChatStore({ threadParent: chatStore.openThreads[id].threadParent });
  } else {
    setChatStore({ threadParent: null });
  }
}

const NavigationContext = createContext({
  selectChannel,
  selectedChannel,
});

export function NavigationProvider(props: ParentProps) {
  return (
    <NavigationContext.Provider value={{ selectedChannel, selectChannel }}>
      {props.children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}
