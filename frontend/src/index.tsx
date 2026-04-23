/* @refresh reload */
import { render } from "solid-js/web";
import "./style.css";
import App from "./App";
import { AuthProvider } from "./AuthContext";
import { NavigationProvider } from "./NavigationContext";

const root = document.getElementById("root");

render(
  () => (
    <AuthProvider>
      <NavigationProvider>
        <App />
      </NavigationProvider>
    </AuthProvider>
  ),
  root!,
);
