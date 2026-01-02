import React, { useState, useEffect } from 'react';
import { Container, Typography, List, Grid, Box, CircularProgress, TextField, CardActionArea, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import GitHubContributionsGraph from './GitHubContributionsGraph';

const CustomCard = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  transition: '0.3s',
  '&:hover': {
    transform: 'scale(1.02)',
    boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
  },
}));

const ImageContainer = styled(Paper)(({ theme }) => ({
  height: 200,
  width: '100%',
  backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
        const response = await fetch('/github_contributions.json');
        const data = await response.json();
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
        user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.github_username.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : leaderboard;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={4}>
          <ImageContainer>
            <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
              GitHub
            </Typography>
          </ImageContainer>
        </Grid>
        <Grid item xs={12} sm={8}>
          <Typography variant="h4" gutterBottom component="div" sx={{ fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}>
            GitHub Contributions Leaderboard
          </Typography>
          <Typography variant="h6" gutterBottom component="div" sx={{ fontFamily: "'Roboto', sans-serif", fontWeight: 400 }}>
            Track Your GitHub Activity
          </Typography>
        </Grid>
      </Grid>

      <TextField
        fullWidth
        label="Search by name or username"
        variant="outlined"
        sx={{ mb: 2 }}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <Grid container spacing={2} sx={{ fontWeight: 'bold' }}>
        <Grid item xs={3}>NAME</Grid>
        <Grid item xs={3}>TOTAL CONTRIBUTIONS</Grid>
        <Grid item xs={3}>CONTRIBUTION CHANGE</Grid>
        <Grid item xs={3}>LAST UPDATED</Grid>
      </Grid>

      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {filteredLeaderboard.map((user, index) => (
          <CustomCard key={index}>
            <CardActionArea onClick={() => handleCardClick(user)}>
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
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.1)', p: 0.5, borderRadius: 1, width: 'fit-content' }}>
                      {user.contribution_delta > 0 ? (
                        <ArrowUpwardIcon sx={{ color: 'green' }} />
                      ) : user.contribution_delta < 0 ? (
                        <ArrowDownwardIcon sx={{ color: 'red' }} />
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
