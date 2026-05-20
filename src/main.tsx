import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./tracking/demo-setup";
import { initAutoTracking } from "./tracking/init-tracker";

initAutoTracking({ app: "demo-app" });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
