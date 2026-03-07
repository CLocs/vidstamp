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
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          A CSV file with your timestamps has been downloaded.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Please email that file to the study coordinator to submit your responses.
        </Typography>
        <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={() => navigate("/video")}>
            Back
          </Button>
          <Button variant="outlined" onClick={() => navigate("/")}>
            Return Home
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
