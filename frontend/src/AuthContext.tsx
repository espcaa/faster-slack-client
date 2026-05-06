import {
  createSignal,
  createContext,
  useContext,
  ParentProps,
  onMount,
} from "solid-js";
import { Events } from "@wailsio/runtime";
import {
  GetSession,
  IsLoggedIn,
  MaximiseWindow,
} from "../bindings/fastslack/slackauthservice";
import type { SlackSession } from "../bindings/fastslack/shared/models";

const [authed, setAuthed] = createSignal(false);
const [ready, setReady] = createSignal(false);
const [session, setSession] = createSignal<SlackSession | null>(null);
const [workspace, setWorkspace] = createSignal<string | null>(null);

Events.On("auth:success", async () => {
  const s = await GetSession();
  if (s) {
    setSession(s);
    const firstTeam = Object.keys(s.workspaces)[0];
    setWorkspace(firstTeam);
    setAuthed(true);
    MaximiseWindow();
  }
});

Events.On("auth:logout", () => {
  setSession(null);
  setWorkspace(null);
  setAuthed(false);
});

const AuthContext = createContext({
  authed,
  ready,
  setAuthed,
  session,
  workspace,
  setWorkspace,
});

export function AuthProvider(props: ParentProps) {
  onMount(async () => {
    const loggedIn = await IsLoggedIn();
    if (loggedIn) {
      const s = await GetSession();
      if (s) {
        setSession(s);
        const firstTeam = Object.keys(s.workspaces)[0];
        setWorkspace(firstTeam);
        setAuthed(true);
      }
    }
    setReady(true);
  });

  return (
    <AuthContext.Provider
      value={{ authed, ready, setAuthed, session, workspace, setWorkspace }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
