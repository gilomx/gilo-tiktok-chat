import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage.jsx";
import OverlayPage from "./pages/OverlayPage.jsx";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/overlay" element={<OverlayPage />} />
      <Route path="/overlay/:overlayId" element={<OverlayPage />} />
    </Routes>
  </BrowserRouter>
);
