import { useState } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  TextField,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const ENTRY_PASSWORD = "obgyn";

export default function Home() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleStart = () => {
    if (password.trim().toLowerCase() !== ENTRY_PASSWORD) {
      setError("Incorrect password");
      return;
    }
    setError("");
    navigate("/survey");
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
        >
          Start
        </Button>
      </Box>
    </Container>
  );
}
