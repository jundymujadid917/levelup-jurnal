import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(reg => console.log("SW registered:", reg.scope))
      .catch(err => console.log("SW failed:", err));
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<React.StrictMode><App /></React.StrictMode>);
