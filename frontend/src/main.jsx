import React from "react"; import { createRoot } from "react-dom/client";
import { useState } from "react"; import App from "./App.jsx"; import Splash from "./Splash.jsx"; import "./styles.css";
function Root() { const [s, setS] = useState(!sessionStorage.getItem("splashed"));
  return <><div className="bg-fx" /><App />{s && <Splash onDone={() => { sessionStorage.setItem("splashed", "1"); setS(false); }} />}</>; }
createRoot(document.getElementById("root")).render(<Root />);
document.addEventListener("pointermove", (e) => { const c = e.target.closest && e.target.closest(".card"); if (c) { const r = c.getBoundingClientRect(); c.style.setProperty("--mx", e.clientX - r.left + "px"); c.style.setProperty("--my", e.clientY - r.top + "px"); } });
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); window.__bip = e; });
if ("serviceWorker" in navigator && import.meta.env.PROD) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
