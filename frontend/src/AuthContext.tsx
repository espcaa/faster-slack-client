import { createSignal, createContext, useContext, ParentProps } from "solid-js";

const [authed, setAuthed] = createSignal(false);

const AuthContext = createContext({ authed, setAuthed });

export function AuthProvider(props: ParentProps) {
  return (
    <AuthContext.Provider value={{ authed, setAuthed }}>
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
