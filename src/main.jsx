import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./editorial.css";
import App from "./App.jsx";
import AboutProject from "./AboutProject.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/about" element={<AboutProject />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
