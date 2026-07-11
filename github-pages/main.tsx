import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../app/globals.css";
import "../app/motion.css";
import "../app/editorial.css";

import Home from "../app/page";
import { PwaRegister } from "../app/pwa-register";

const root = document.getElementById("root");

if (!root) throw new Error("Missing application root");

createRoot(root).render(
  <StrictMode>
    <Home />
    <PwaRegister />
  </StrictMode>,
);
