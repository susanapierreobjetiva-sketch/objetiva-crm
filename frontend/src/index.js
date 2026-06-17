import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const style = document.createElement("style");
style.textContent = `
  * { box-sizing: border-box; }
  body { margin: 0; font-size: 16px; -webkit-font-smoothing: antialiased; }
  input, select, textarea, button { font-size: 15px; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<React.StrictMode><App /></React.StrictMode>);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(r => console.log("SW registrado:", r.scope))
      .catch(e => console.log("SW error:", e));
  });
}
