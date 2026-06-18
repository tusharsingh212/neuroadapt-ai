import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/styles/tailwind.css";
import { AadhaarDemoApp } from "@/demo/AadhaarDemoApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AadhaarDemoApp />
  </StrictMode>
);
