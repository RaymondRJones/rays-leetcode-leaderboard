import React, { useState, useEffect } from 'react';
import { Container, Typography, List, ListItem, Grid, Box, CircularProgress, TextField, CardActionArea, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
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
  height: 200, // adjust this based on your actual needs
  width: '100%',
  backgroundImage: 'url(dsa.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  marginBottom: theme.spacing(2),
}));

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('/users_by_elo.json');
        const data = await response.json();
        data.sort((a, b) => b.elo - a.elo);
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

  const handleCardClick = (profileName) => {
    window.open(`https://leetcode.com/${profileName}`, '_blank');
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
            DSA Group Leaderboard 
          </Typography>
          <Typography variant="h6" gutterBottom component="div" sx={{ fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}>
            Next Goal - Crush DSA
          </Typography>
        </Grid>
      </Grid>
      <TextField
        fullWidth
        label="Search by name"
        variant="outlined"
        sx={{ mb: 2 }}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {filteredLeaderboard.map((user, index) => (
          <CustomCard key={index}>
            <CardActionArea onClick={() => handleCardClick(user.name)}>
              <Grid container justifyContent="space-between" alignItems="center">
                <Grid item xs={8}>
                  <ListItem alignItems="flex-start">
                    <Grid container justifyContent="space-between" alignItems="center">
                      <Grid item>
                        <Typography variant="h6" component="span" sx={{ fontFamily: "'Roboto', sans-serif" }}>
                          #{index + 1} {user.name}
                        </Typography>
                      </Grid>
                      <Grid item>
                        <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold', fontFamily: "'Roboto', sans-serif" }}>
                          ELO: {user.elo}
                        </Typography>
                      </Grid>
                    </Grid>
                  </ListItem>
                </Grid>
                  <Grid item xs={4}>
                    {user.prev_elo !== undefined && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.1)', p: 0.5, borderRadius: 1, width: 'fit-content', ml: 'auto' }}>
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
              </Grid>
            </CardActionArea>
          </CustomCard>
        ))}
      </List>
    </Container>
  );
}

export default Leaderboard;
