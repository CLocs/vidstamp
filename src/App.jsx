import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Survey from "./pages/Survey";
import VideoPage from "./pages/VideoPage";
import ThankYou from "./pages/ThankYou";
import { CssBaseline } from "@mui/material";

export default function App() {
  return (
    <Router>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/survey" element={<Survey />} />
        <Route path="/video" element={<VideoPage />} />
        <Route path="/thankyou" element={<ThankYou />} />
      </Routes>
    </Router>
  );
}
