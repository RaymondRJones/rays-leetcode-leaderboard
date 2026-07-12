import React, { useState, useEffect } from 'react';
import { Container, Typography, List, Grid, Box, CircularProgress, TextField, CardActionArea, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import GitHubContributionsGraph from './GitHubContributionsGraph';

const CustomCard = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  background: 'rgba(13, 15, 18, 0.72)',
  transition: 'border-color 160ms ease, background 160ms ease, transform 160ms ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    borderColor: '#3a414a',
    background: 'rgba(20, 23, 27, 0.72)',
  },
}));

const ImageContainer = styled(Paper)(({ theme }) => ({
  height: 200,
  width: '100%',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  borderColor: theme.palette.divider,
  backgroundImage: 'linear-gradient(135deg, rgba(239, 93, 168, 0.2), transparent 58%), linear-gradient(135deg, rgba(53, 196, 134, 0.16), transparent), #14171b',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  marginBottom: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

function GitHubContributions() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'https://weathered-dream-8f83.rayjones2170.workers.dev';
        const response = await fetch(`${API_URL}?key=github:data`);
        const result = await response.json();

        let data = [];
        if (result.value && result.value !== 'null') {
          try {
            data = JSON.parse(result.value);
          } catch (e) {
            console.error("Failed to parse github data:", e);
            data = [];
          }
        }

        data.sort((a, b) => b.contribution_delta - a.contribution_delta);
        setLeaderboard(data);
      } catch (error) {
        console.error("Failed to fetch GitHub contributions data:", error);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const handleCardClick = (user) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  const handleViewProfile = () => {
    if (selectedUser) {
      window.open(`https://github.com/${selectedUser.github_username}`, '_blank');
    }
  };

  const filteredLeaderboard = searchTerm
    ? leaderboard.filter((user) =>
        String(user.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(user.github_username || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : leaderboard;

  const totalContributions = leaderboard.reduce((sum, user) => sum + (user.contribution_delta ?? 0), 0);
  const topContributor = leaderboard[0];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
      <Grid container spacing={4} alignItems="center" sx={{ mb: 5 }}>
        <Grid item xs={12} sm={4}>
          <ImageContainer>
            <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700 }}>
              GitHub
            </Typography>
          </ImageContainer>
        </Grid>
        <Grid item xs={12} sm={8}>
          <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, letterSpacing: '0.14em' }}>
            Activity
          </Typography>
          <Typography variant="h3" gutterBottom component="h1" sx={{ mt: 1 }}>
            GitHub Contributions Leaderboard
          </Typography>
          <Typography variant="h6" gutterBottom component="div" color="text.secondary" sx={{ maxWidth: 560, lineHeight: 1.55 }}>
            Track Your GitHub Activity
          </Typography>
        </Grid>
      </Grid>

      <Grid container spacing={0.125} sx={{ mb: 5, overflow: 'hidden', border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'divider' }}>
        {[
          ['Players', leaderboard.length],
          ['Contribution change', totalContributions],
          ['Current leader', topContributor?.display_name || topContributor?.github_username || 'None'],
          ['Signal', 'Public activity'],
        ].map(([label, value]) => (
          <Grid key={label} item xs={12} sm={6} md={3}>
            <Box sx={{ minHeight: 92, p: 2.25, bgcolor: 'rgba(13, 15, 18, 0.86)' }}>
              <Typography variant="h5" component="strong" sx={{ display: 'block' }}>
                {value}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {label}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <TextField
        fullWidth
        label="Search by name or username"
        variant="outlined"
        sx={{ mb: 2 }}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <Grid container spacing={2} sx={{ px: 2, py: 1.5, color: 'text.disabled', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em' }}>
        <Grid item xs={3}>NAME</Grid>
        <Grid item xs={3}>TOTAL CONTRIBUTIONS</Grid>
        <Grid item xs={3}>CONTRIBUTION CHANGE</Grid>
        <Grid item xs={3}>LAST UPDATED</Grid>
      </Grid>

      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {filteredLeaderboard.map((user, index) => (
          <CustomCard key={index}>
            <CardActionArea onClick={() => handleCardClick(user)} sx={{ p: { xs: 1, sm: 0 } }}>
              <Grid container justifyContent="space-between" alignItems="center">
                <Grid item xs={3}>
                  <Typography variant="h6" component="span" sx={{ fontFamily: "'Roboto', sans-serif", p: 2 }}>
                    #{index + 1} {user.display_name}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold', fontFamily: "'Roboto', sans-serif" }}>
                    {user.current_contributions}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  {user.prev_contributions !== undefined && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', bgcolor: 'rgba(20, 23, 27, 0.9)', p: 0.5, borderRadius: 1, width: 'fit-content' }}>
                      {user.contribution_delta > 0 ? (
                        <ArrowUpwardIcon sx={{ color: 'primary.main' }} />
                      ) : user.contribution_delta < 0 ? (
                        <ArrowDownwardIcon sx={{ color: 'secondary.main' }} />
                      ) : (
                        <RemoveIcon sx={{ color: 'grey' }} />
                      )}
                      <Typography variant="subtitle2" component="span" sx={{ fontFamily: "'Roboto', sans-serif", ml: 0.5 }}>
                        {user.contribution_delta > 0 ? '+' : ''}{user.contribution_delta}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="subtitle2" component="span" sx={{ fontFamily: "'Roboto', sans-serif" }}>
                    {user.last_updated ? new Date(user.last_updated).toLocaleDateString() : 'Never'}
                  </Typography>
                </Grid>
              </Grid>
            </CardActionArea>
          </CustomCard>
        ))}
      </List>

      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedUser && (
            <Box>
              <Typography variant="h5">{selectedUser.display_name}</Typography>
              <Typography variant="body2" color="text.secondary">
                @{selectedUser.github_username} | Total: {selectedUser.current_contributions} contributions
              </Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedUser && <GitHubContributionsGraph userData={selectedUser} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleViewProfile} variant="outlined">
            View GitHub Profile
          </Button>
          <Button onClick={handleCloseModal} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default GitHubContributions;
