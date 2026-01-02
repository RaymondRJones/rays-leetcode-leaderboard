import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import RegisterForm from './RegisterForm';

const HeroSection = styled(Paper)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: theme.spacing(6),
  marginBottom: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  color: 'white',
  textAlign: 'center',
}));

function Register() {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <HeroSection elevation={3}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
          Join the Challenge
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9 }}>
          Track your LeetCode and GitHub progress alongside your peers
        </Typography>
      </HeroSection>

      <RegisterForm />

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 500 }}>
          How it works
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" paragraph>
            <strong>1. Register:</strong> Enter your LeetCode and GitHub usernames to join the leaderboards.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>2. Automatic Tracking:</strong> Your problem-solving progress and contributions are tracked automatically.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>3. Compete:</strong> See how you rank against others and track your improvement over time.
          </Typography>
          <Typography variant="body1" paragraph sx={{ mt: 3, fontStyle: 'italic', color: 'text.secondary' }}>
            Note: You'll appear on the leaderboards after the next automated update (typically daily).
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

export default Register;
