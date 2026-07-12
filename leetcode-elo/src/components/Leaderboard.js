import React, { useState, useEffect } from 'react';
import { Container, Typography, List, ListItem, Grid, Box, CircularProgress, TextField, CardActionArea, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import { Link as RouterLink } from 'react-router-dom';
import UserProgressGraph from './UserProgressGraph';

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
  backgroundImage: 'linear-gradient(135deg, rgba(53, 196, 134, 0.2), transparent 60%), url(DSA.png)',
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
  const currentDate = new Date();
  const currentMonthName = currentDate.toLocaleString(undefined, { month: 'long' });
  const nextMonthName = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    .toLocaleString(undefined, { month: 'long' });

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

  const totalProblemsSolved = leaderboard.reduce((sum, user) => sum + (user.current_problem_delta ?? 0), 0);
  const topMover = leaderboard[0];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
      <Grid container spacing={4} alignItems="center" sx={{ mb: 5 }}>
        <Grid item xs={12} sm={4}>
          <ImageContainer />
        </Grid>
        <Grid item xs={12} sm={8}>
          <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, letterSpacing: '0.14em' }}>
            Monthly Challenge
          </Typography>
          <Typography variant="h3" gutterBottom component="h1" sx={{ mt: 1 }}>
            {currentMonthName} Leetcode Challenge
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom component="div" sx={{ maxWidth: 560, lineHeight: 1.55 }}>
            Solve 30 New Problems by {nextMonthName} 1st
          </Typography>
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            startIcon={<PersonAddAltIcon />}
            sx={{ mt: 2 }}
          >
            Add yourself
          </Button>
        </Grid>
      </Grid>

      <Grid container spacing={0.125} sx={{ mb: 5, overflow: 'hidden', border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'divider' }}>
        {[
          ['Players', leaderboard.length],
          ['Problems this month', totalProblemsSolved],
          ['Current leader', topMover?.display_name || topMover?.name || 'None'],
          ['Goal', `30 by ${nextMonthName} 1`],
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
        label="Search by name"
        variant="outlined"
        sx={{ mb: 2 }}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Grid container spacing={2} sx={{ px: 2, py: 1.5, color: 'text.disabled', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em' }}>
        <Grid item xs={3}>NAME</Grid>
        <Grid item xs={2}>ELO</Grid>
        <Grid item xs={3}>RATING CHANGE</Grid>
        <Grid item xs={3}>NEW PROBLEMS SOLVED THIS MONTH</Grid>
      </Grid>
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {filteredLeaderboard.map((user, index) => (
          <CustomCard key={index}>
            <CardActionArea onClick={() => handleCardClick(user)} sx={{ p: { xs: 1, sm: 0 } }}>
              <Grid container justifyContent="space-between" alignItems="center">
                <Grid item xs={3}>
                  <ListItem alignItems="flex-start" sx={{ py: 1.75 }}>
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
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', bgcolor: 'rgba(20, 23, 27, 0.9)', p: 0.5, borderRadius: 1, width: 'fit-content' }}>
                      {user.elo > user.prev_elo ? (
                        <ArrowUpwardIcon sx={{ color: 'primary.main' }} />
                      ) : user.elo < user.prev_elo ? (
                        <ArrowDownwardIcon sx={{ color: 'secondary.main' }} />
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
