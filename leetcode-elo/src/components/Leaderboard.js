import React, { useState, useEffect } from 'react';
import { Container, Typography, List, ListItem, Grid, Box, CircularProgress, TextField, CardActionArea, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import UserProgressGraph from './UserProgressGraph';

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
  backgroundImage: 'url(DSA.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  marginBottom: theme.spacing(2),
}));

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'https://weathered-dream-8f83.rayjones2170.workers.dev';
        const response = await fetch(`${API_URL}?key=leetcode:data`);
        const result = await response.json();

        let data = [];
        if (result.value && result.value !== 'null') {
          try {
            data = JSON.parse(result.value);
          } catch (e) {
            console.error("Failed to parse leetcode data:", e);
            data = [];
          }
        }

        data.sort((a, b) => b.current_problem_delta - a.current_problem_delta);
        setLeaderboard(data);
      } catch (error) {
        console.error("Failed to fetch leaderboard data:", error);
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
      window.open(`https://leetcode.com/${selectedUser.name}`, '_blank');
    }
  };

  const filteredLeaderboard = searchTerm
    ? leaderboard.filter((user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : leaderboard;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={4}>
          <ImageContainer />
        </Grid>
        <Grid item xs={12} sm={8}>
          <Typography variant="h4" gutterBottom component="div" sx={{ fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}>
            July Leetcode Challenge 
          </Typography>
          <Typography variant="h6" gutterBottom component="div" sx={{ fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}>
            Solve 30 New Problems by August 4th
          </Typography>
        </Grid>
      </Grid>

      <TextField
        fullWidth
        label="Search by name"
        variant="outlined"
        sx={{ mb: 2, mt: 2 }}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Grid container spacing={2} sx={{ fontWeight: 'bold' }}>
        <Grid item xs={3}>NAME</Grid>
        <Grid item xs={2}>ELO</Grid>
        <Grid item xs={3}>RATING CHANGE</Grid>
        <Grid item xs={3}>NEW PROBLEMS SOLVED THIS MONTH</Grid>
      </Grid>
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {filteredLeaderboard.map((user, index) => (
          <CustomCard key={index}>
            <CardActionArea onClick={() => handleCardClick(user)}>
              <Grid container justifyContent="space-between" alignItems="center">
                <Grid item xs={3}>
                  <ListItem alignItems="flex-start">
                    <Typography variant="h6" component="span" sx={{ fontFamily: "'Roboto', sans-serif" }}>
                      #{index + 1} {user.display_name ? user.display_name : user.name}
                    </Typography>
                  </ListItem>
                </Grid>
                <Grid item xs={2}>
                  <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold', fontFamily: "'Roboto', sans-serif" }}>
                    {user.elo}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  {user.prev_elo !== undefined && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.1)', p: 0.5, borderRadius: 1, width: 'fit-content' }}>
                      {user.elo > user.prev_elo ? (
                        <ArrowUpwardIcon sx={{ color: 'green' }} />
                      ) : user.elo < user.prev_elo ? (
                        <ArrowDownwardIcon sx={{ color: 'red' }} />
                      ) : (
                        <RemoveIcon sx={{ color: 'grey' }} />
                      )}
                      <Typography variant="subtitle2" component="span" sx={{ fontFamily: "'Roboto', sans-serif", ml: 0.5 }}>
                        {user.elo - user.prev_elo} since last contest
                      </Typography>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold', fontFamily: "'Roboto', sans-serif" }}>
                    {user.current_problem_delta ?? 0}
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedUser && (
            <Box>
              <Typography variant="h5">{selectedUser.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Current: {selectedUser.current_problem_count} problems | ELO: {selectedUser.elo}
              </Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedUser && <UserProgressGraph userData={selectedUser} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleViewProfile} variant="outlined">
            View LeetCode Profile
          </Button>
          <Button onClick={handleCloseModal} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Leaderboard;
