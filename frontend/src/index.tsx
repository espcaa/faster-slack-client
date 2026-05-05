/* @refresh reload */
import { render } from "solid-js/web";
import "./style.css";
import App from "./App";
import { AuthProvider } from "./AuthContext";
import { SettingsProvider } from "./SettingsContext";

const root = document.getElementById("root");

render(
  () => (
    <AuthProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </AuthProvider>
  ),
  root!,
);
