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

const YOUTUBE_VIDEO_ID = "TKQKumsHW88";

export default function VideoPage() {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [timestamps, setTimestamps] = useState([]);
  const [finished, setFinished] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const navigate = useNavigate();

  // Load YouTube IFrame API and create player
  useEffect(() => {
    const initPlayer = () => {
      const container = containerRef.current;
      if (!container || window.YT == null) return;

      playerRef.current = new window.YT.Player(container, {
        videoId: YOUTUBE_VIDEO_ID,
        width: "100%",
        playerVars: {
          autoplay: 0,
          controls: 1,
        },
        events: {
          onReady: () => setPlayerReady(true),
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.ENDED) {
              setFinished(true);
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(tag, firstScript);

    window.onYouTubeIframeAPIReady = initPlayer;

    return () => {
      delete window.onYouTubeIframeAPIReady;
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
      }
    };
  }, []);

  // Listen for spacebar to record timestamps
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && playerRef.current?.getCurrentTime) {
        e.preventDefault();
        const t = playerRef.current.getCurrentTime();
        if (typeof t === "number" && !isNaN(t)) {
          setTimestamps((prev) => [...prev, parseFloat(t.toFixed(2))]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Poll progress while player is ready and playing
  useEffect(() => {
    if (!playerReady) return;

    const interval = setInterval(() => {
      const player = playerRef.current;
      if (player?.getCurrentTime && player?.getDuration) {
        const current = player.getCurrentTime();
        const duration = player.getDuration();
        if (typeof current === "number" && typeof duration === "number" && duration > 0) {
          setProgress((current / duration) * 100);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [playerReady]);

  const handleRecordTimestamp = () => {
    const player = playerRef.current;
    if (player?.getCurrentTime) {
      const t = player.getCurrentTime();
      if (typeof t === "number" && !isNaN(t)) {
        setTimestamps((prev) => [...prev, parseFloat(t.toFixed(2))]);
      }
    }
  };

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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Press Space or the button below to record timestamps.
        </Typography>
        <Box
          ref={containerRef}
          sx={{
            marginTop: "1.5rem",
            borderRadius: "10px",
            overflow: "hidden",
            position: "relative",
            "& iframe": { borderRadius: "10px" },
          }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleRecordTimestamp}
          sx={{ mt: 2 }}
        >
          Record timestamp ({timestamps.length})
        </Button>
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
