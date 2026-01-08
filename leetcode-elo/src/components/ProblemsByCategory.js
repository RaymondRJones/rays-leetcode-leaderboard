import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  CircularProgress,
  Button,
  Pagination
} from '@mui/material';

// Memoized Problem Card Component
const ProblemCard = React.memo(({ problem, selectedCategory, onCategoryClick }) => {
  return (
    <Card variant="outlined" sx={{ mb: 2, width: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
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
          <Chip
            label={`ELO: ${Math.round(problem.Rating)}`}
            color="primary"
            size="small"
          />
        </Box>

        <Typography color="textSecondary" variant="body2" sx={{ mb: 1 }}>
          Contest:{' '}
          <a
            href={`https://leetcode.com/contest/${problem.ContestSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {problem.ContestID_en}
          </a>
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
          {problem.Topics && problem.Topics.map(topic => (
            <Chip
              key={topic}
              label={topic}
              size="small"
              variant={topic === selectedCategory ? "filled" : "outlined"}
              color={topic === selectedCategory ? "secondary" : "default"}
              onClick={() => onCategoryClick(topic)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
});

ProblemCard.displayName = 'ProblemCard';

function ProblemsByCategory() {
  const [allProblems, setAllProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minElo, setMinElo] = useState('');
  const [maxElo, setMaxElo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await fetch('/problems_with_categories.json');
        const data = await response.json();
        setAllProblems(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching problems:', error);
        setLoading(false);
      }
    };

    fetchProblems();
  }, []);

  // Memoize category list and stats
  const { allCategories, categoryStats } = useMemo(() => {
    const categoriesMap = new Map();

    allProblems.forEach(problem => {
      if (problem.Topics && Array.isArray(problem.Topics)) {
        problem.Topics.forEach(topic => {
          categoriesMap.set(topic, (categoriesMap.get(topic) || 0) + 1);
        });
      }
    });

    const sortedCategories = Array.from(categoriesMap.keys()).sort();

    return {
      allCategories: sortedCategories,
      categoryStats: categoriesMap
    };
  }, [allProblems]);

  // Memoize filtered problems
  const filteredProblems = useMemo(() => {
    let filtered = allProblems;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(problem =>
        problem.Topics && problem.Topics.includes(selectedCategory)
      );
    }

    // Filter by search term
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(problem =>
        problem.Title.toLowerCase().includes(searchLower)
      );
    }

    // Filter by ELO range
    const minEloNum = minElo !== '' ? parseFloat(minElo) : -Infinity;
    const maxEloNum = maxElo !== '' ? parseFloat(maxElo) : Infinity;

    if (minEloNum > -Infinity || maxEloNum < Infinity) {
      filtered = filtered.filter(problem =>
        problem.Rating >= minEloNum && problem.Rating <= maxEloNum
      );
    }

    // Sort by rating (highest first)
    return filtered.sort((a, b) => b.Rating - a.Rating);
  }, [allProblems, selectedCategory, debouncedSearchTerm, minElo, maxElo]);

  // Memoize paginated problems
  const paginatedProblems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProblems.slice(startIndex, endIndex);
  }, [filteredProblems, currentPage]);

  const totalPages = Math.ceil(filteredProblems.length / itemsPerPage);

  const handleReset = useCallback(() => {
    setSelectedCategory('');
    setMinElo('');
    setMaxElo('');
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setCurrentPage(1);
  }, []);

  const handleCategoryClick = useCallback((category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((event, value) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        LeetCode Problems by Category
      </Typography>

      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Browse and filter LeetCode problems by topic/category and difficulty rating
      </Typography>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="">
                  <em>All Categories</em>
                </MenuItem>
                {allCategories.map(category => (
                  <MenuItem key={category} value={category}>
                    {category} ({categoryStats.get(category)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search by Problem Name"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type to search..."
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Min ELO"
              type="number"
              variant="outlined"
              value={minElo}
              onChange={(e) => {
                setMinElo(e.target.value);
                setCurrentPage(1);
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Max ELO"
              type="number"
              variant="outlined"
              value={maxElo}
              onChange={(e) => {
                setMaxElo(e.target.value);
                setCurrentPage(1);
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleReset}
              sx={{ height: '56px' }}
            >
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" color="primary">
          {filteredProblems.length} problem{filteredProblems.length !== 1 ? 's' : ''} found
          {selectedCategory && ` in ${selectedCategory}`}
        </Typography>
        {filteredProblems.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredProblems.length)}
          </Typography>
        )}
      </Box>

      {/* Problems List */}
      <Box display="flex" flexDirection="column" alignItems="center">
        {filteredProblems.length === 0 ? (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 4 }}>
            No problems found matching your criteria.
          </Typography>
        ) : (
          <>
            {paginatedProblems.map((problem) => (
              <ProblemCard
                key={problem.ID}
                problem={problem}
                selectedCategory={selectedCategory}
                onCategoryClick={handleCategoryClick}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </>
        )}
      </Box>
    </Container>
  );
}

export default ProblemsByCategory;
