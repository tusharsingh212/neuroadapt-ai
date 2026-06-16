import React from "react";
import ReactDOM from "react-dom/client";

import "@/styles/tailwind.css";
import { DemoApp } from "@/demo/DemoApp";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DemoApp />
  </React.StrictMode>
);
