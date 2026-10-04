import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { browserStorage, DocStore } from "./store";
import "./styles/fonts-charter.css";
import "./styles/fonts.css";
import "./styles/fonts-sans.css";
import "./styles/app.css";
import "./styles/panes.css";
import "./styles/dialogs.css";
import "./styles/editor.css";
import "./styles/controls.css";
import "./styles/style-panel.css";
import "./styles/source.css";
import "./styles/cv-page.css";
import "./styles/cv.css";
import "./styles/print.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App
        store={new DocStore(browserStorage())}
        prefs={browserStorage()}
        env={{
          confirm: (message) => window.confirm(message),
          print: () => {
            window.print();
          },
          hash: () => window.location.hash,
          clearHash: () => {
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search,
            );
          },
          baseUrl: () => window.location.origin + window.location.pathname,
          fonts: document.fonts,
        }}
      />
    </StrictMode>,
  );
}
