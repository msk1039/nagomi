import { inject } from "@vercel/analytics";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./styles.css";

inject();

const rootElement = document.querySelector<HTMLDivElement>("#root");
if (!rootElement) throw new Error("Missing required element: #root");

document.documentElement.classList.add("dark");
createRoot(rootElement).render(<App />);
