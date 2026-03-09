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

const ADMIN_TOKEN_KEY = "vidstamp_admin_token";
const REFRESH_INTERVAL_MS = 30000; // 30 seconds

function getApiBase() {
  return import.meta.env.VITE_VIDSTAMP_API_URL?.replace(/\/$/, "");
}

function getAuthHeaders() {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

export default function Results() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(() => !!sessionStorage.getItem(ADMIN_TOKEN_KEY));
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleAdminLogin = async () => {
    const apiBase = getApiBase();
    if (!apiBase) {
      setPasswordError("API not configured");
      return;
    }
    if (!password.trim()) {
      setPasswordError("Enter the password");
      return;
    }
    setPasswordError("");
    setLoginLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim(), scope: "admin" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordError(data.detail || "Incorrect password");
        return;
      }
      const token = data.access_token;
      if (token) {
        sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
        setAuthenticated(true);
      }
    } catch (err) {
      setPasswordError(err?.message || "Network error");
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchSessions = async () => {
    const apiBase = getApiBase();
    if (!apiBase) {
      setError("API URL not configured");
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`${apiBase}/export/sessions`, { headers: getAuthHeaders() });
      if (res.status === 401) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        setAuthenticated(false);
        return;
      }
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

  const handleClearAll = async () => {
    const apiBase = getApiBase();
    if (!apiBase) return;
    setClearing(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/sessions`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        setAuthenticated(false);
        setClearConfirmOpen(false);
        return;
      }
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
    const apiBase = getApiBase();
    if (!apiBase) return;
    const url = `${apiBase}/export`;
    fetch(url, { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          setAuthenticated(false);
          return null;
        }
        return r.text();
      })
      .then((csv) => {
        if (csv == null) return;
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
        <Button variant="contained" onClick={handleAdminLogin} disabled={loginLoading}>
          {loginLoading ? "Checking…" : "View results"}
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
