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

// Your R2 public URL (from bucket Public access / R2 dev subdomain or custom domain)
const VIDEO_URL =
  "https://pub-05948a525013432aada6712ce583b048.r2.dev/reflect/Sample_Surgery1_cut1a.mp4";

const RESTORE_KEY = "vidstamp_restore";

function getInitialTimestamps() {
  try {
    const raw = sessionStorage.getItem(RESTORE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data.timestamps) ? data.timestamps : [];
  } catch {
    return [];
  }
}

export default function VideoPage() {
  const videoRef = useRef(null);
  const timestampsListRef = useRef(null);
  const restoreTimeRef = useRef(null);
  const [timestamps, setTimestamps] = useState(getInitialTimestamps);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // Restore video position when returning from Thank You (Back)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RESTORE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data.videoTime === "number" && data.videoTime >= 0) {
          restoreTimeRef.current = data.videoTime;
        }
        sessionStorage.removeItem(RESTORE_KEY);
      }
    } catch (_) {}
  }, []);

  // Listen for m (record) and u (undo)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const inInput = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName);
      if (inInput) return;

      if (e.key === "m") {
        e.preventDefault();
        if (videoRef.current) {
          const t = videoRef.current.currentTime.toFixed(2);
          setTimestamps((prev) => [...prev, parseFloat(t)]);
        }
        return;
      }
      if (e.key === "u") {
        e.preventDefault();
        setTimestamps((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
        return;
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

  const handleRecordTimestamp = () => {
    if (videoRef.current) {
      const t = videoRef.current.currentTime.toFixed(2);
      setTimestamps((prev) => [...prev, parseFloat(t)]);
    }
  };

  const handleUndo = () => {
    setTimestamps((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  };

  const escapeCsv = (val) => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const handleSubmit = () => {
    const participant = JSON.parse(sessionStorage.getItem("participant")) || {};
    const header = "role,pgy,timestamps";
    const rows = timestamps.map((t, i) =>
      [
        i === 0 ? escapeCsv(participant.role ?? "") : "",
        i === 0 ? escapeCsv(participant.pgy ?? "") : "",
        escapeCsv(t),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vidstamp_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    sessionStorage.setItem(
      RESTORE_KEY,
      JSON.stringify({
        timestamps,
        videoTime: videoRef.current ? videoRef.current.currentTime : 0,
      })
    );
    navigate("/thankyou");
  };

  // Scroll timestamps list to bottom when a new one is added
  useEffect(() => {
    const el = timestampsListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [timestamps]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(2);
    return m > 0 ? `${m}:${s.padStart(5, "0")}` : `${s}s`;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 6 }}>
      <Paper elevation={4} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ textAlign: "center" }}>
          Watch the Video
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 1,
            textAlign: "center",
            "& kbd": {
              px: 0.5,
              py: 0.25,
              fontFamily: "monospace",
              bgcolor: "action.hover",
              borderRadius: 0.5,
              fontSize: "0.85em",
            },
          }}
        >
          Record: <kbd>M</kbd>. Undo: <kbd>U</kbd>.
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
            alignItems: "flex-start",
            mt: 2,
          }}
        >
          <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
            <video
              ref={videoRef}
              src={VIDEO_URL}
              controls
              width="100%"
              style={{ borderRadius: "10px" }}
              onLoadedMetadata={() => {
                if (
                  restoreTimeRef.current != null &&
                  videoRef.current &&
                  restoreTimeRef.current > 0
                ) {
                  videoRef.current.currentTime = restoreTimeRef.current;
                  restoreTimeRef.current = null;
                }
              }}
            />
            <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleRecordTimestamp}
                sx={{ borderWidth: 3 }}
              >
                ✅ Record timestamp
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleUndo}
                disabled={timestamps.length === 0}
                sx={{
                  color: "black",
                  borderColor: "black",
                  "&:hover": {
                    borderColor: "black",
                    bgcolor: "action.hover",
                  },
                }}
              >
                ↩️ Undo
              </Button>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ mt: 3, height: 8, borderRadius: 4 }}
            />

            {timestamps.length >= 1 && (
              <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
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
          </Box>

          <Paper
            variant="outlined"
            sx={{
              width: { xs: "100%", md: 220 },
              flexShrink: 0,
              maxHeight: 400,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}
            >
              Timestamps ({timestamps.length})
            </Typography>
            <Box
              ref={timestampsListRef}
              sx={{
                overflow: "auto",
                flex: 1,
                minHeight: 0,
              }}
            >
              {timestamps.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ p: 2 }}
                >
                  No timestamps yet
                </Typography>
              ) : (
                timestamps.map((t, i) => (
                  <Box
                    key={i}
                    sx={{
                      px: 2,
                      py: 0.75,
                      borderBottom: 1,
                      borderColor: "divider",
                      "&:last-child": { borderBottom: 0 },
                      fontFamily: "monospace",
                      fontSize: "0.875rem",
                    }}
                  >
                    {i + 1}. {formatTime(t)}
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Box>
      </Paper>
    </Container>
  );
}
