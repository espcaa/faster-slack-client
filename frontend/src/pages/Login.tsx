import { createSignal, createEffect, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { StartLogin } from "../../bindings/fastslack/slackauthservice";
import styles from "./Login.module.css";
import { MdRoundArrow_forward } from "solid-icons/md";
import { Events } from "@wailsio/runtime";
import { useAuth } from "../AuthContext";

export default function Login() {
  const [loading, setLoading] = createSignal(false);
  const { authed } = useAuth();
  const navigate = useNavigate();

  createEffect(() => {
    if (authed()) {
      navigate("/");
    }
  });

  const handleLogin = () => {
    StartLogin();
  };

  Events.On("auth:loading", (event) => {
    setLoading(event.data as boolean);
  });

  return (
    <div class={styles.layout}>
      <div class={styles.contentContainer}>
        <div class={styles.content}>
          <Show when={!loading()} fallback={<div class={styles.spinner} />}>
            <h1>Welcome to a faster, cooler slack client :)</h1>
            <button
              class={`btn btn--primary ${styles.heavy}`}
              onClick={handleLogin}
            >
              Sign in with slack <MdRoundArrow_forward />
            </button>
          </Show>
        </div>
      </div>
      <div class={styles.sidebar} />
    </div>
  );
}
