import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Container, TextField, Button, Box, Card, CardContent, InputAdornment, IconButton, Stack, Chip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import Leaderboard from './components/Leaderboard';
import LeetcodeCoinCalculator from './components/LeetcodeCoinCalculator';
import GitHubContributions from './components/GitHubContributions';
import Register from './components/Register';
import ProblemsByCategory from './components/ProblemsByCategory';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfUse from './components/TermsOfUse';
import { BrowserRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Leaderboard' },
  { to: '/register', label: 'Join' },
  { to: '/github', label: 'GitHub' },
  { to: '/categories', label: 'Categories' },
  { to: '/zerotrac', label: 'Zerotrac' },
  { to: '/calculator', label: 'Calculator' },
];

function SiteNav() {
  return (
    <AppBar position="sticky">
      <Toolbar
        sx={{
          width: 'min(1344px, 100%)',
          mx: 'auto',
          px: { xs: 2, md: 4 },
          gap: 3,
          flexWrap: { xs: 'wrap', lg: 'nowrap' },
          py: { xs: 1, lg: 0 },
        }}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25, minWidth: { xs: '100%', md: 'auto' } }}>
          <Box
            aria-hidden="true"
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 28,
              height: 28,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '50%',
              bgcolor: 'background.paper',
              color: 'primary.main',
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            RJ
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', whiteSpace: 'nowrap' }}>
            Coding with Raymond
          </Typography>
        </Box>
        <Box
          component="nav"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'flex-start', md: 'center' },
            gap: 0.5,
            flex: 1,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            pb: { xs: 0.5, lg: 0 },
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            '& a': {
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 36,
              px: 1.75,
              borderRadius: 1,
              color: 'text.secondary',
              fontSize: 14,
              fontWeight: 650,
              whiteSpace: 'nowrap',
              transition: 'background 160ms ease, color 160ms ease',
            },
            '& a:hover, & a.active': {
              bgcolor: 'rgba(20, 23, 27, 0.9)',
              color: 'text.primary',
            },
          }}
        >
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

function SiteFooter() {
  return (
    <Box
      component="footer"
      sx={{
        width: 'min(1344px, 100%)',
        mx: 'auto',
        px: { xs: 2, md: 4 },
        py: 4,
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        color: 'text.disabled',
      }}
    >
      <Typography variant="body2">
        Ray's LeetCode Leaderboard
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </Box>
    </Box>
  );
}

function App() {
  const [inputTerm, setInputTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [problems, setProblems] = useState([]);
  const [originalProblems, setOriginalProblems] = useState([]);
  const [minElo, setMinElo] = useState('');
  const [maxElo, setMaxElo] = useState('');
  const [randomProblem, setRandomProblem] = useState(null);

  useEffect(() => {
    document.title = "Coding with Raymond - Leetcode Leaderboard";
    const fetchProblems = async () => {
      const response = await fetch('/problems_with_categories.json');
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
    filterProblems(inputTerm);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      initiateSearch();
      event.preventDefault();
    }
  };

  const handleMinEloChange = (event) => {
    setMinElo(event.target.value);
  };

  const handleMaxEloChange = (event) => {
    setMaxElo(event.target.value);
  };

  const filterProblems = (term = searchTerm) => {
    const min = minElo === '' ? -Infinity : Number(minElo);
    const max = maxElo === '' ? Infinity : Number(maxElo);
    const filtered = originalProblems.filter(
      (problem) =>
        problem.Rating >= min &&
        problem.Rating <= max &&
        problem.Title.toLowerCase().includes(term.toLowerCase())
    );
    setProblems(filtered);
  };

  const resetFilters = () => {
    setMinElo('');
    setMaxElo('');
    setSearchTerm('');
    setInputTerm('');
    setProblems(originalProblems);
    setRandomProblem(null);
  };

  return (
    <Router>
    <Box sx={{ minHeight: '100vh' }}>
    <SiteNav />
    <Routes>
      <Route path="/zerotrac" element={
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
        <Box sx={{ maxWidth: 760, mx: 'auto', textAlign: 'center', mb: 7 }}>
          <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, letterSpacing: '0.14em' }}>
            Zerotrac
          </Typography>
          <Typography variant="h3" component="h1" sx={{ mt: 1 }}>
            LeetCode Problems by ELO
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2, lineHeight: 1.65 }}>
            Search rated problems, set an ELO range, or let the picker choose a focused next problem.
          </Typography>
        </Box>
        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <TextField
            fullWidth
            id="search-bar"
            label="Search By Name"
            variant="outlined"
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

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
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
            <Button variant="outlined" onClick={resetFilters}>
              Reset
            </Button>
            <Button variant="contained" startIcon={<ShuffleIcon />} onClick={pickRandomProblem}>
              Random
            </Button>
          </Stack>
          </CardContent>
        </Card>
        {randomProblem && (
          <Card variant="outlined" sx={{ mb: 3, borderColor: 'rgba(53, 196, 134, 0.65)', bgcolor: 'rgba(53, 196, 134, 0.08)' }}>
            <CardContent>
              <Chip label="Random pick" color="primary" size="small" sx={{ mb: 1.5 }} />
              <Typography variant="h5" component="h2">
                <a
                  href={`https://leetcode.com/problems/${randomProblem.TitleSlug}`}
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
                  href={`https://leetcode.com/contest/${randomProblem.ContestSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {randomProblem.ContestSlug}
                </a>
              </Typography>
            </CardContent>
          </Card>
        )}


        <Box display="grid" gap={1.5}>
          {problems.slice(0, 10).map((problem) => (
            <Card key={problem.ID} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Box>
                <Typography variant="h6" component="h2">
                  <a
                    href={`https://leetcode.com/problems/${problem.TitleSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {problem.Title}
                  </a>
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.75 }}>
                  Contest:{' '}
                  <a
                    href={`https://leetcode.com/contest/${problem.ContestSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    
                    {problem.ContestSlug}
                  </a>
                </Typography>
                </Box>
                <Chip label={`ELO ${Math.round(problem.Rating)}`} color="primary" />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

      </Container>
      }/>
    <Route path="/" element={<Leaderboard />} />
    <Route path="/categories" element={<ProblemsByCategory />} />
    <Route path="/github" element={<GitHubContributions />} />
    <Route path="/register" element={<Register />} />
    <Route path="/calculator" element={<LeetcodeCoinCalculator/>} />
    <Route path="/privacy" element={<PrivacyPolicy />} />
    <Route path="/terms" element={<TermsOfUse />} />
  </Routes>
  <SiteFooter />
  </Box>
</Router>
  );
}

export default App;
