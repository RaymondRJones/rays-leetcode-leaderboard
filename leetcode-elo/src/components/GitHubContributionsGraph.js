import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Typography, Paper, Grid } from '@mui/material';

function GitHubContributionsGraph({ userData }) {
  const normalizeData = (contributionsArray) => {
    if (!contributionsArray || contributionsArray.length === 0) return [];
    if (typeof contributionsArray[0] === 'object' && contributionsArray[0].date) {
      return contributionsArray;
    }
    return [];
  };

  const processCalendarData = (calendarData) => {
    if (!calendarData || calendarData.length === 0) return [];
    const dailyContributions = [];
    calendarData.forEach(week => {
      week.contributionDays.forEach(day => {
        dailyContributions.push({
          date: day.date,
          count: day.contributionCount
        });
      });
    });
    return dailyContributions;
  };

  const getContributionColor = (count) => {
    if (count === 0) return '#ebedf0';
    if (count < 5) return '#9be9a8';
    if (count < 10) return '#40c463';
    if (count < 15) return '#30a14e';
    return '#216e39';
  };

  const chartData = normalizeData(userData.contributions_each_week);
  const calendarData = processCalendarData(userData.calendar_data);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1.5, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {formatDate(payload[0].payload.date)}
          </Typography>
          <Typography variant="body2" color="primary">
            Contributions: {payload[0].value}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  if (chartData.length === 0 && calendarData.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No historical data available yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {chartData.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
            Contributions Over Time
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis label={{ value: 'Total Contributions', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                name="Total Contributions"
                stroke="#1976d2"
                strokeWidth={2}
                dot={{ fill: '#1976d2', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {calendarData.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
            Recent Activity Calendar (Last 90 Days)
          </Typography>
          <Grid container spacing={0.5} sx={{ maxWidth: '100%', overflow: 'auto' }}>
            {calendarData.slice(-90).map((day, index) => (
              <Grid item key={index}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    backgroundColor: getContributionColor(day.count),
                    borderRadius: 0.5,
                    '&:hover': {
                      transform: 'scale(1.5)',
                      zIndex: 1,
                    },
                    transition: 'transform 0.2s',
                  }}
                  title={`${day.date}: ${day.count} contributions`}
                />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, justifyContent: 'center' }}>
            <Typography variant="caption">Less</Typography>
            {[0, 3, 8, 12, 16].map((count) => (
              <Box
                key={count}
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: getContributionColor(count),
                  borderRadius: 0.5,
                }}
              />
            ))}
            <Typography variant="caption">More</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default GitHubContributionsGraph;
