import React from "react";
import ReactDOM from "react-dom/client";

import "@/styles/tailwind.css";
import { LandingApp } from "@/landing/LandingApp";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <LandingApp />
  </React.StrictMode>
);
