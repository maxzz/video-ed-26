import "./utils/util-hooks/x-devtool-install-block";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./components/0-all/0-app.tsx";
import { initApp } from "./features/0-session/0-store/2-init-app";

initApp();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
