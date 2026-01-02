import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Container, TextField, Button, Box, Card, CardContent, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Leaderboard from './components/Leaderboard';
import LeetcodeCoinCalculator from './components/LeetcodeCoinCalculator';
import GitHubContributions from './components/GitHubContributions';
import Register from './components/Register';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

function App() {
  const [inputTerm, setInputTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [problems, setProblems] = useState([]);
  const [originalProblems, setOriginalProblems] = useState([]);
  const [minElo, setMinElo] = useState(0);
  const [maxElo, setMaxElo] = useState(0);
  const [randomProblem, setRandomProblem] = useState(null);

  useEffect(() => {
    document.title = "Leaderboard";
    const fetchProblems = async () => {
      const response = await fetch('/ratings.json');
      const data = await response.json();
      setProblems(data);
      setOriginalProblems(data);
    };
    fetchProblems();
  }, []);
  
  const pickRandomProblem = () => {
    if (problems.length === 0) return; // No problems to choose from
    const randomIndex = Math.floor(Math.random() * problems.length);
    setRandomProblem(problems[randomIndex]);
  };

  const initiateSearch = () => {
    setSearchTerm(inputTerm);
    filterProblems();
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      initiateSearch();
      event.preventDefault();
    }
  };

  const handleMinEloChange = (event) => {
    setMinElo(Number(event.target.value));
  };

  const handleMaxEloChange = (event) => {
    setMaxElo(Number(event.target.value));
  };

  const filterProblems = () => {
    const filtered = originalProblems.filter(
      (problem) =>
        problem.Rating >= minElo &&
        problem.Rating <= maxElo &&
        problem.Title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setProblems(filtered);
  };

  const resetFilters = () => {
    setMinElo(0);
    setMaxElo(0);
    setSearchTerm('');
    setInputTerm('');
    setProblems(originalProblems);
    setRandomProblem(null);
  };

  return (
    <Router>
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Ray's DSA Leaderboard 
        </Typography>
        {/* Add navigation links */}
        <Link to="/zerotrac" style={{ color: 'white', textDecoration: 'none', margin: '0 10px' }}>Zerotrac</Link>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', margin: '0 10px' }}>Leaderboard</Link>
        <Link to="/github" style={{ color: 'white', textDecoration: 'none', margin: '0 10px' }}>GitHub Contributions</Link>
        <Link to="/register" style={{ color: 'white', textDecoration: 'none', margin: '0 10px' }}>Register</Link>
        <Link to="/calculator" style={{ color: 'white', textDecoration: 'none', margin: '0 10px' }}>Leetcode T-Shirt Calculator</Link>
      </Toolbar>
    </AppBar>
    <Routes>
      <Route path="/zerotrac" element={
    <div>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box my={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            LeetCode Problems by ELO
          </Typography>
          <TextField
            fullWidth
            id="search-bar"
            label="Search By Name"
            variant="outlined"
            margin="normal" // Adds standard spacing
            value={inputTerm}
            onChange={(e) => setInputTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={initiateSearch}>
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
            <TextField
              label="Min ELO"
              variant="outlined"
              onKeyPress={handleKeyPress}
              value={minElo}
              onChange={handleMinEloChange}
            />
            <TextField
              label="Max ELO"
              variant="outlined"
              value={maxElo}
              onKeyPress={handleKeyPress}
              onChange={handleMaxEloChange}
            />
            <Button variant="contained" color="primary" onClick={resetFilters}>
              Reset
            </Button>
            <Box mt={2}>
              <Button variant="contained" onClick={pickRandomProblem}>
                Pick a Random Problem
              </Button>
            </Box>

          </Box>
        </Box>
        {randomProblem && (
          <Card variant="outlined" sx={{ mt: 2, width: '100%', backgroundColor: 'lightgreen' }}>
            <CardContent>
              <Typography variant="h5" component="h2">
                <a
                  href={`https://leetcode.com/problems/${randomProblem["Title Slug"]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {randomProblem.Title}
                </a>
              </Typography>
              <Typography color="textSecondary">
                Contest:{' '}
                <a
                  href={`https://leetcode.com/contest/${randomProblem["Contest Slug"]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {randomProblem["Contest Slug"]}
                </a>
              </Typography>
            </CardContent>
          </Card>
        )}


        <Box display="flex" flexDirection="column" alignItems="center">
          {problems.slice(0, 10).map((problem) => (
            <Card key={problem.ID} variant="outlined" sx={{ mb: 2, width: '100%' }}>
              <CardContent>
                <Typography variant="h5" component="h2">
                  <a
                    href={`https://leetcode.com/problems/${problem["Title Slug"]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {problem.Title}
                  </a>
                </Typography>
                <Typography color="textSecondary">
                  Rating: {Math.round(problem.Rating)}
                </Typography>
                <Typography color="textSecondary">
                  Contest:{' '}
                  <a
                    href={`https://leetcode.com/contest/${problem["Contest Slug"]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    
                    {problem["Contest Slug"]}
                  </a>
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

      </Container>
      { /* 
      <Box mt={5} display="flex" justifyContent="center">
        <DonateButton></DonateButton>
      </Box>
          */}
    </div>
      }/>
    <Route path="/" element={<Leaderboard />} />
    <Route path="/github" element={<GitHubContributions />} />
    <Route path="/register" element={<Register />} />
    <Route path="/calculator" element={<LeetcodeCoinCalculator/>} />
  </Routes>
</Router>
  );
}

export default App;
