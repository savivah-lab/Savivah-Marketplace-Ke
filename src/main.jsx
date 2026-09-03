import React from "react";
import ReactDOM from "react-dom/client";
import SavivahApp from "./App.jsx";
import { ErrorBoundary } from "./ErrorBoundary.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SavivahApp />
    </ErrorBoundary>
  </React.StrictMode>
);
