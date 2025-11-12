import React, { useRef, useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  LinearProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function VideoPage() {
  const videoRef = useRef(null);
  const [timestamps, setTimestamps] = useState([]);
  const [finished, setFinished] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const videoUrl = "https://your-backend.com/videos/training.mp4";

  // Listen for spacebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && videoRef.current) {
        e.preventDefault();
        const t = videoRef.current.currentTime.toFixed(2);
        setTimestamps((prev) => [...prev, parseFloat(t)]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Track progress
  useEffect(() => {
    const video = videoRef.current;
    const updateProgress = () => {
      if (video && video.duration > 0) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };
    video?.addEventListener("timeupdate", updateProgress);
    return () => video?.removeEventListener("timeupdate", updateProgress);
  }, []);

  const handleEnded = () => setFinished(true);

  const handleSubmit = () => {
    const participant = JSON.parse(sessionStorage.getItem("participant"));
    console.log("Submitting:", { participant, timestamps });

    // TODO: POST to backend
    // await fetch("/api/save", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ participant, timestamps }),
    // });

    navigate("/thankyou");
  };

  return (
    <Container maxWidth="md" sx={{ mt: 6, textAlign: "center" }}>
      <Paper elevation={4} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Watch the Video
        </Typography>
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          width="100%"
          onEnded={handleEnded}
          style={{ marginTop: "1.5rem", borderRadius: "10px" }}
        />
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mt: 3, height: 8, borderRadius: 4 }}
        />

        {finished && (
          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={handleSubmit}
            >
              Submit
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
