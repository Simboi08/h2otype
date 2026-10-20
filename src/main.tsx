import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./arcade.css";
import "./feedback.css";
import "./wordsets.css";
import "./results.css";
import "./screenBursts.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import "./passageMotion.css";
