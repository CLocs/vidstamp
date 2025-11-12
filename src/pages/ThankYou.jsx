import { Container, Typography, Box, Paper, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function ThankYou() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Thank You!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your responses have been recorded successfully.
        </Typography>
        <Box>
          <Button variant="outlined" onClick={() => navigate("/")}>
            Return Home
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
