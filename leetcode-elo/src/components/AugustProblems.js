import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';

const WORKER_URL = process.env.REACT_APP_API_URL || 'https://weathered-dream-8f83.rayjones2170.workers.dev';
const CLIENTS = ['nafis', 'saad'];
const CHALLENGE_START = new Date(2026, 7, 5);

function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

const AUGUST_PROBLEMS = [
  ['Alert Using Same Key-Card Three or More Times in a One Hour Period', 'alert-using-same-key-card-three-or-more-times-in-a-one-hour-period'],
  ['Sum of Mutated Array Closest to Target', 'sum-of-mutated-array-closest-to-target'],
  ['Find a Safe Walk Through a Grid', 'find-a-safe-walk-through-a-grid'],
  ['House Robber V', 'house-robber-v'],
  ['Minimum Operations to Make Array Modulo Alternating I', 'minimum-operations-to-make-array-modulo-alternating-i'],
  ['Rank Teams by Votes', 'rank-teams-by-votes'],
  ['Can Convert String in K Moves', 'can-convert-string-in-k-moves'],
  ['Count Ways to Group Overlapping Ranges', 'count-ways-to-group-overlapping-ranges'],
  ['Number of Operations to Make Network Connected', 'number-of-operations-to-make-network-connected'],
  ['Reward Top K Students', 'reward-top-k-students'],
  ['Identify the Largest Outlier in an Array', 'identify-the-largest-outlier-in-an-array'],
  ['Sum of Digit Differences of All Pairs', 'sum-of-digit-differences-of-all-pairs'],
  ['Split Array With Minimum Difference', 'split-array-with-minimum-difference'],
  ['Minimum Remove to Make Valid Parentheses', 'minimum-remove-to-make-valid-parentheses'],
  ['Shortest Path in Binary Matrix', 'shortest-path-in-binary-matrix'],
  ['Number of Closed Islands', 'number-of-closed-islands'],
  ['Divide Array Into Increasing Sequences', 'divide-array-into-increasing-sequences'],
  ['As Far from Land as Possible', 'as-far-from-land-as-possible'],
  ['Minimum Absolute Distance Between Mirror Pairs', 'minimum-absolute-distance-between-mirror-pairs'],
  ['Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit', 'longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit'],
  ['Maximum XOR After Operations', 'maximum-xor-after-operations'],
  ['Minimum Lines to Represent a Line Chart', 'minimum-lines-to-represent-a-line-chart'],
  ['Course Schedule IV', 'course-schedule-iv'],
  ['The Number of the Smallest Unoccupied Chair', 'the-number-of-the-smallest-unoccupied-chair'],
  ['Inverse Coin Change', 'inverse-coin-change'],
  ['Count Subarrays Where Max Element Appears at Least K Times', 'count-subarrays-where-max-element-appears-at-least-k-times'],
  ['Closest Dessert Cost', 'closest-dessert-cost'],
  ['Find Good Days to Rob the Bank', 'find-good-days-to-rob-the-bank'],
  ['Maximize Points After Choosing K Tasks', 'maximize-points-after-choosing-k-tasks'],
  ['Ambiguous Coordinates', 'ambiguous-coordinates'],
].map(([title, slug], index) => {
  const date = new Date(
    CHALLENGE_START.getFullYear(),
    CHALLENGE_START.getMonth(),
    CHALLENGE_START.getDate() + index
  );

  return {
    day: index + 1,
    dateKey: toDateKey(date),
    dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    title,
    url: `https://leetcode.com/problems/${slug}/`,
  };
});

const EMPTY_PROGRESS = {
  nafis: Array(AUGUST_PROBLEMS.length).fill(false),
  saad: Array(AUGUST_PROBLEMS.length).fill(false),
};

function normalizeProgress(value) {
  return Object.fromEntries(CLIENTS.map((client) => [
    client,
    AUGUST_PROBLEMS.map((_, index) => value?.[client]?.[index] === true),
  ]));
}

function ProgressSummary({ name, completed, color }) {
  const percentage = Math.round((completed / AUGUST_PROBLEMS.length) * 100);

  return (
    <Paper
      variant="outlined"
      sx={{
        flex: 1,
        minWidth: 0,
        p: { xs: 2, sm: 2.5 },
        bgcolor: 'rgba(13, 15, 18, 0.78)',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
        <Typography variant="h6">{name}</Typography>
        <Typography variant="body2" sx={{ color, fontWeight: 800 }}>
          {completed} / {AUGUST_PROBLEMS.length}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percentage}
        aria-label={`${name} progress`}
        sx={{
          mt: 1.5,
          height: 6,
          borderRadius: 999,
          bgcolor: 'rgba(255,255,255,0.08)',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 999 },
        }}
      />
    </Paper>
  );
}

function AugustProblems() {
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    const previousTitle = document.title;
    const existingRobots = document.querySelector('meta[name="robots"]');
    const previousRobots = existingRobots?.getAttribute('content');
    const robots = existingRobots || document.createElement('meta');

    document.title = 'Nafis / Saad August Problems';
    robots.setAttribute('name', 'robots');
    robots.setAttribute('content', 'noindex, nofollow');
    if (!existingRobots) document.head.appendChild(robots);

    return () => {
      document.title = previousTitle;
      if (existingRobots) {
        if (previousRobots === null) existingRobots.removeAttribute('content');
        else existingRobots.setAttribute('content', previousRobots);
      } else {
        robots.remove();
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProgress() {
      try {
        const response = await fetch(`${WORKER_URL}/august-problems`, { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load progress.');
        if (active) setProgress(normalizeProgress(result.progress));
      } catch {
        if (active) setError('Progress could not be loaded. Please refresh and try again.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProgress();
    return () => { active = false; };
  }, []);

  const totals = useMemo(() => Object.fromEntries(
    CLIENTS.map((client) => [client, progress[client].filter(Boolean).length])
  ), [progress]);

  const todayKey = toDateKey(new Date());

  async function toggleProblem(client, day) {
    const index = day - 1;
    const key = `${client}:${day}`;
    const previousValue = progress[client][index];
    const completed = !previousValue;

    setError('');
    setProgress((current) => ({
      ...current,
      [client]: current[client].map((value, problemIndex) => problemIndex === index ? completed : value),
    }));
    setPending((current) => new Set(current).add(key));

    try {
      const response = await fetch(`${WORKER_URL}/august-problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client, problem: day, completed }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save progress.');
    } catch {
      setProgress((current) => ({
        ...current,
        [client]: current[client].map((value, problemIndex) => problemIndex === index ? previousValue : value),
      }));
      setError('That change could not be saved. Please try again.');
    } finally {
      setPending((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Box sx={{ mb: { xs: 4, md: 5 } }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
          <Chip label="Aug 5 – Sep 3, 2026" color="primary" size="small" />
          <Typography variant="body2" color="text.secondary">
            One problem every day
          </Typography>
        </Stack>
        <Typography variant="h3" component="h1" sx={{ maxWidth: 720, fontSize: { xs: '2.35rem', sm: '3.25rem' } }}>
          Nafis / Saad August Problems
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 630, lineHeight: 1.7 }}>
          Work through the same 30-problem playlist from August 5 through September 3. Open the problem on LeetCode, then check your name when you finish.
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
        <ProgressSummary name="Nafis" completed={totals.nafis} color="#35c486" />
        <ProgressSummary name="Saad" completed={totals.saad} color="#ef5da8" />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ overflow: 'hidden', bgcolor: 'rgba(7, 8, 10, 0.38)' }}>
        <Box
          sx={{
            display: { xs: 'none', sm: 'grid' },
            gridTemplateColumns: '84px minmax(0, 1fr) 72px 72px',
            gap: 1,
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            color: 'text.disabled',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.08em' }}>DATE</Typography>
          <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.08em' }}>PROBLEM</Typography>
          <Typography variant="caption" align="center" sx={{ fontWeight: 800, letterSpacing: '0.08em' }}>NAFIS</Typography>
          <Typography variant="caption" align="center" sx={{ fontWeight: 800, letterSpacing: '0.08em' }}>SAAD</Typography>
        </Box>

        {loading ? (
          <Box sx={{ minHeight: 260, display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : AUGUST_PROBLEMS.map((problem) => {
          const isToday = problem.dateKey === todayKey;
          const bothDone = progress.nafis[problem.day - 1] && progress.saad[problem.day - 1];

          return (
            <Box
              key={problem.day}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '58px minmax(0, 1fr) auto auto', sm: '84px minmax(0, 1fr) 72px 72px' },
                gap: { xs: 0.5, sm: 1 },
                alignItems: 'center',
                minHeight: { xs: 78, sm: 68 },
                px: 2,
                py: 1,
                borderBottom: problem.day === AUGUST_PROBLEMS.length ? 0 : 1,
                borderColor: 'divider',
                bgcolor: isToday ? 'rgba(53, 196, 134, 0.07)' : 'transparent',
                opacity: bothDone ? 0.68 : 1,
                transition: 'background 160ms ease, opacity 160ms ease',
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800, color: isToday ? 'primary.main' : 'text.secondary' }}>
                  {problem.dateLabel}
                </Typography>
                {isToday && (
                  <Typography variant="caption" sx={{ color: 'primary.main', fontSize: 9, fontWeight: 800 }}>
                    TODAY
                  </Typography>
                )}
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  component="a"
                  href={problem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    fontWeight: 650,
                    lineHeight: 1.35,
                    textDecoration: bothDone ? 'line-through' : 'none',
                    textDecorationColor: 'text.disabled',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {problem.title}
                  <LaunchRoundedIcon sx={{ flex: '0 0 auto', fontSize: 15, color: 'text.disabled' }} />
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.5 }}>
                  Problem {problem.day} of {AUGUST_PROBLEMS.length}
                </Typography>
              </Box>

              {CLIENTS.map((client) => {
                const isPending = pending.has(`${client}:${problem.day}`);
                return (
                  <Box key={client} sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.disabled" sx={{ display: { xs: 'block', sm: 'none' }, textTransform: 'capitalize' }}>
                      {client}
                    </Typography>
                    <Checkbox
                      checked={progress[client][problem.day - 1]}
                      disabled={isPending}
                      onChange={() => toggleProblem(client, problem.day)}
                      inputProps={{ 'aria-label': `${client} completed ${problem.title}` }}
                      icon={<RadioButtonUncheckedRoundedIcon />}
                      checkedIcon={<CheckCircleRoundedIcon />}
                      sx={{
                        p: 0.75,
                        color: 'text.disabled',
                        '&.Mui-checked': { color: client === 'nafis' ? '#35c486' : '#ef5da8' },
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Paper>

      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
        Progress saves automatically and is shared across devices.
      </Typography>
    </Container>
  );
}

export { AUGUST_PROBLEMS };
export default AugustProblems;
