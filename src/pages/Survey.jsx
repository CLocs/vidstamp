import { useState } from "react";
import {
  Container,
  Button,
  Typography,
  Paper,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const ROLE_ATTENDING = "attending";
const ROLE_RESIDENT_FELLOW = "resident_fellow";
const PGY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export default function Survey() {
  const [role, setRole] = useState("");
  const [pgy, setPgy] = useState("");
  const navigate = useNavigate();

  const canProceed = () => {
    if (role !== ROLE_ATTENDING && role !== ROLE_RESIDENT_FELLOW) return false;
    if (role === ROLE_RESIDENT_FELLOW) {
      const pgyNum = parseInt(pgy, 10);
      return Number.isInteger(pgyNum) && pgyNum >= 1 && pgyNum <= 7;
    }
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) return;
    const participant = {
      role,
      ...(role === ROLE_RESIDENT_FELLOW && { pgy: pgy ? parseInt(pgy, 10) : null }),
    };
    sessionStorage.setItem("participant", JSON.stringify(participant));
    navigate("/video");
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          I am a...
        </Typography>
        <FormControl component="fieldset" sx={{ mt: 2, width: "100%" }}>
          <RadioGroup
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              if (e.target.value === ROLE_ATTENDING) setPgy("");
            }}
          >
            <FormControlLabel
              value={ROLE_ATTENDING}
              control={<Radio />}
              label="Attending"
            />
            <FormControlLabel
              value={ROLE_RESIDENT_FELLOW}
              control={<Radio />}
              label="Resident or Fellow"
            />
          </RadioGroup>
        </FormControl>

        {role === ROLE_RESIDENT_FELLOW && (
          <FormControl fullWidth sx={{ mt: 3 }}>
            <InputLabel id="pgy-label">I am PGY...</InputLabel>
            <Select
              labelId="pgy-label"
              label="I am PGY..."
              value={pgy}
              onChange={(e) => setPgy(e.target.value)}
            >
              <MenuItem value="">
                <em>Select PGY</em>
              </MenuItem>
              {PGY_OPTIONS.map((n) => (
                <MenuItem key={n} value={String(n)}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 4 }}
          onClick={handleNext}
          disabled={!canProceed()}
        >
          Next
        </Button>
      </Paper>
    </Container>
  );
}
