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
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const AUTH_KEY = "vidstamp_results_authenticated";
const REFRESH_INTERVAL_MS = 30000; // 30 seconds
const ADMIN_PASSWORD = "obgyn"; // same as study entry password

export default function Results() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(AUTH_KEY) === "1");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    if (!authenticated) return;
    fetchSessions();
    const interval = setInterval(fetchSessions, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [authenticated]);

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
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Button variant="outlined" onClick={fetchSessions} disabled={loading}>
          Refresh
        </Button>
        <Button variant="outlined" onClick={handleDownloadCsv} disabled={!sessions.length}>
          Download CSV
        </Button>
        <Button variant="outlined" onClick={() => navigate("/")}>
          Back to app
        </Button>
      </Box>
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
                <TableCell>Created at</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
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
