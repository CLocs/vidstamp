import { useState } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const ENTRY_TOKEN_KEY = "vidstamp_entry_token";
const API_BASE = import.meta.env.VITE_VIDSTAMP_API_URL?.replace(/\/$/, "");

export default function Home() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!password.trim()) {
      setError("Enter the password");
      return;
    }
    if (!API_BASE) {
      setError("API not configured");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim(), scope: "entry" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "Incorrect password");
        return;
      }
      const token = data.access_token;
      if (token) sessionStorage.setItem(ENTRY_TOKEN_KEY, token);
      navigate("/survey");
    } catch (err) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ textAlign: "center", mt: 10 }}>
      <Box>
        <Typography variant="h3" gutterBottom>
          Welcome to the REFLECT Study
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You’ll watch a short video and answer a few quick questions.
        </Typography>
        <TextField
          type="password"
          label="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleStart();
          }}
          error={!!error}
          helperText={error}
          fullWidth
          autoComplete="off"
          sx={{ mt: 4 }}
        />
        <Button
          variant="contained"
          color="primary"
          size="large"
          sx={{ mt: 3 }}
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Start"}
        </Button>
      </Box>
    </Container>
  );
}
