import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import RegisterForm from './RegisterForm';

const HeroSection = styled(Paper)(({ theme }) => ({
  background: 'linear-gradient(135deg, rgba(53, 196, 134, 0.12), transparent 58%), rgba(13, 15, 18, 0.72)',
  borderColor: theme.palette.divider,
  padding: theme.spacing(6),
  marginBottom: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  textAlign: 'center',
}));

function Register() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 9 } }}>
      <HeroSection elevation={0}>
        <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, letterSpacing: '0.14em' }}>
          Self Registration
        </Typography>
        <Typography variant="h3" gutterBottom sx={{ mt: 1 }}>
          Join the Challenge
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto', lineHeight: 1.55 }}>
          Add your LeetCode profile to the leaderboard
        </Typography>
      </HeroSection>

      <RegisterForm />

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          How it works
        </Typography>
        <Box sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
          <Typography variant="body1" paragraph>
            <strong>1. Register:</strong> Enter your LeetCode username, GitHub username, and display name.
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
