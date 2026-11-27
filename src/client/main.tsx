import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./i18n/I18n.tsx";
import { App } from "./app/App.tsx";
import "./styles/global.css";
const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");
createRoot(root).render(
  <I18nProvider>
    <App />
  </I18nProvider>,
);
