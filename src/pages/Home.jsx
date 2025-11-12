import { Container, Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ textAlign: "center", mt: 10 }}>
      <Box>
        <Typography variant="h3" gutterBottom>
          Welcome to the Study
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You’ll watch a short video and answer a few quick questions.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          sx={{ mt: 5 }}
          onClick={() => navigate("/survey")}
        >
          Start
        </Button>
      </Box>
    </Container>
  );
}
