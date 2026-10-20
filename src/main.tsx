import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import DailyLeaderboardProvider from "./DailyLeaderboardProvider";
import "./styles.css";
import "./arcade.css";
import "./feedback.css";
import "./wordsets.css";
import "./results.css";
import "./screenBursts.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DailyLeaderboardProvider>
      <App />
    </DailyLeaderboardProvider>
  </StrictMode>,
);

import "./passageMotion.css";
