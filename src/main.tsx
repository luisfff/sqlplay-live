import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { configureAppEngine } from "./engine/wasm-app";
import "./styles.css";

// Tell the engine how to load the WASM binary (Vite-served URL).
configureAppEngine();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
