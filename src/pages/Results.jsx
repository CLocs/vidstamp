import { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const AUTH_KEY = "vidstamp_results_authenticated";
const REFRESH_INTERVAL_MS = 30000; // 30 seconds
const ADMIN_PASSWORD = "obgyn"; // same as study entry password
const DEFAULT_VIDEO_URL =
  "https://pub-05948a525013432aada6712ce583b048.r2.dev/reflect/Sample_Surgery1_cut1a.mp4";

export default function Results() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(AUTH_KEY) === "1");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState(DEFAULT_VIDEO_URL);
  const [videoUrlMessage, setVideoUrlMessage] = useState("");

  const handleAdminLogin = () => {
    if (password.trim().toLowerCase() !== ADMIN_PASSWORD) {
      setPasswordError("Incorrect password");
      return;
    }
    setPasswordError("");
    sessionStorage.setItem(AUTH_KEY, "1");
    setAuthenticated(true);
  };

  const fetchSessions = async () => {
    const apiBase = import.meta.env.VITE_VIDSTAMP_API_URL;
    const apiKey = import.meta.env.VITE_VIDSTAMP_API_KEY;
    if (!apiBase) {
      setError("API URL not configured");
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const headers = {};
      if (apiKey) headers["X-API-Key"] = apiKey;
      const res = await fetch(`${apiBase.replace(/\/$/, "")}/export/sessions`, { headers });
      if (!res.ok) throw new Error(res.statusText || "Export failed");
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Failed to load results");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoUrl = async () => {
    const apiBase = import.meta.env.VITE_VIDSTAMP_API_URL;
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase.replace(/\/$/, "")}/config/video-url`);
      if (!res.ok) return;
      const data = await res.json();
      const url = data?.video_url?.trim();
      if (url) setVideoUrlInput(url);
    } catch (_) {}
  };

  useEffect(() => {
    if (!authenticated) return;
    fetchSessions();
    fetchVideoUrl();
    const interval = setInterval(fetchSessions, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [authenticated]);

  const handleClearAll = async () => {
    const apiBase = import.meta.env.VITE_VIDSTAMP_API_URL;
    const apiKey = import.meta.env.VITE_VIDSTAMP_API_KEY;
    if (!apiBase) return;
    setClearing(true);
    setError(null);
    try {
      const headers = apiKey ? { "X-API-Key": apiKey } : {};
      const res = await fetch(`${apiBase.replace(/\/$/, "")}/sessions`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(res.statusText || "Clear failed");
      setClearConfirmOpen(false);
      await fetchSessions();
    } catch (err) {
      setError(err?.message || "Failed to clear results");
    } finally {
      setClearing(false);
    }
  };

  const handleDownloadCsv = () => {
    const apiBase = import.meta.env.VITE_VIDSTAMP_API_URL;
    const apiKey = import.meta.env.VITE_VIDSTAMP_API_KEY;
    if (!apiBase) return;
    const url = `${apiBase.replace(/\/$/, "")}/export`;
    const headers = apiKey ? { "X-API-Key": apiKey } : {};
    fetch(url, { headers })
      .then((r) => r.text())
      .then((csv) => {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `vidstamp_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => {});
  };

  const handleSaveVideoUrl = () => {
    const apiBase = import.meta.env.VITE_VIDSTAMP_API_URL;
    const apiKey = import.meta.env.VITE_VIDSTAMP_API_KEY;
    const next = videoUrlInput.trim();
    if (!next) {
      setVideoUrlMessage("Video URL cannot be empty.");
      return;
    }
    if (!apiBase) {
      setVideoUrlMessage("API URL not configured.");
      return;
    }
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["X-API-Key"] = apiKey;
    fetch(`${apiBase.replace(/\/$/, "")}/config/video-url`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ video_url: next }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const msg = await r.text();
          throw new Error(msg || r.statusText);
        }
        setVideoUrlMessage("Saved globally. New sessions will use this URL.");
      })
      .catch((err) => {
        setVideoUrlMessage(`Save failed: ${err?.message || "unknown error"}`);
      });
  };

  const handleResetVideoUrl = () => {
    const apiBase = import.meta.env.VITE_VIDSTAMP_API_URL;
    const apiKey = import.meta.env.VITE_VIDSTAMP_API_KEY;
    if (!apiBase) {
      setVideoUrlMessage("API URL not configured.");
      return;
    }
    const headers = apiKey ? { "X-API-Key": apiKey } : {};
    fetch(`${apiBase.replace(/\/$/, "")}/config/video-url`, {
      method: "DELETE",
      headers,
    })
      .then(async (r) => {
        if (!r.ok) {
          const msg = await r.text();
          throw new Error(msg || r.statusText);
        }
        setVideoUrlInput(DEFAULT_VIDEO_URL);
        setVideoUrlMessage("Reset globally to default URL.");
      })
      .catch((err) => {
        setVideoUrlMessage(`Reset failed: ${err?.message || "unknown error"}`);
      });
  };

  // Admin-only: password gate (no link from participant flow)
  if (!authenticated) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          Admin: View results
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter the password to view participant submissions.
        </Typography>
        <TextField
          type="password"
          label="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setPasswordError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
          error={!!passwordError}
          helperText={passwordError}
          fullWidth
          autoComplete="off"
          sx={{ mb: 2 }}
        />
        <Button variant="contained" onClick={handleAdminLogin}>
          View results
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Results (live)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Submissions from the API. Auto-refreshes every 30 seconds.
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Button variant="outlined" onClick={fetchSessions} disabled={loading}>
          Refresh
        </Button>
        <Button variant="outlined" onClick={handleDownloadCsv} disabled={!sessions.length}>
          Download CSV
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => setClearConfirmOpen(true)}
          disabled={!sessions.length}
        >
          Clear all results
        </Button>
        <Button variant="outlined" onClick={() => navigate("/")}>
          Back to app
        </Button>
      </Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Video source (admin)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Set the global URL used by the participant video page.
        </Typography>
        <TextField
          fullWidth
          size="small"
          label="Video URL"
          value={videoUrlInput}
          onChange={(e) => {
            setVideoUrlInput(e.target.value);
            setVideoUrlMessage("");
          }}
          sx={{ mb: 1.5 }}
        />
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="contained" onClick={handleSaveVideoUrl}>
            Save video URL
          </Button>
          <Button variant="outlined" onClick={handleResetVideoUrl}>
            Reset to default
          </Button>
        </Box>
        {videoUrlMessage && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            {videoUrlMessage}
          </Typography>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1, fontFamily: "monospace", wordBreak: "break-all" }}
        >
          Current video URL: {videoUrlInput}
        </Typography>
      </Paper>
      <Dialog open={clearConfirmOpen} onClose={() => !clearing && setClearConfirmOpen(false)}>
        <DialogTitle>Clear all results?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to clear all timestamp data? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearConfirmOpen(false)} disabled={clearing}>
            Cancel
          </Button>
          <Button onClick={handleClearAll} color="error" variant="contained" disabled={clearing}>
            {clearing ? "Clearing…" : "Clear all"}
          </Button>
        </DialogActions>
      </Dialog>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading && sessions.length === 0 ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 4 }}>
          <CircularProgress size={24} />
          <Typography color="text.secondary">Loading…</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Session ID</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>PGY</TableCell>
                <TableCell align="right">Timestamps</TableCell>
                <TableCell>Created at</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    No submissions yet.
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((row) => (
                  <TableRow key={row.session_id}>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {row.session_id}
                    </TableCell>
                    <TableCell>{row.role}</TableCell>
                    <TableCell>{row.pgy ?? "—"}</TableCell>
                    <TableCell align="right">{row.timestamp_count ?? 0}</TableCell>
                    <TableCell>{row.created_at}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
