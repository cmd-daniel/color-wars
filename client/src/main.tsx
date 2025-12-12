import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "pixi.js/events";
import App from "./App.tsx";
import Toaster from "@components/Toast/toaster.tsx";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <>
      <App />
      <Toaster />
    </>
  </React.StrictMode>,
);
