import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { configureAppEngine } from "./engine/wasm-app";
import "./styles.css";

// Tell the engine how to load the WASM binary (Vite-served URL).
configureAppEngine();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
