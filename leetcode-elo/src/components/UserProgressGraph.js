import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Typography, Paper } from '@mui/material';

function UserProgressGraph({ userData }) {
  const normalizeData = (problemsArray) => {
    if (!problemsArray || problemsArray.length === 0) return [];
    if (typeof problemsArray[0] === 'object' && problemsArray[0].date) {
      return problemsArray;
    }
    return [];
  };

  const chartData = normalizeData(userData.problems_each_week);

  if (chartData.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No historical data available yet.
        </Typography>
      </Box>
    );
  }

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
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
            Problems: {payload[0].value}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: '100%', height: 400, p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
        Problems Solved Over Time
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(167, 173, 180, 0.22)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            angle={-45}
            textAnchor="end"
            height={80}
            stroke="#a7adb4"
          />
          <YAxis stroke="#a7adb4" label={{ value: 'Problems Solved', angle: -90, position: 'insideLeft', fill: '#a7adb4' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#a7adb4' }} />
          <Line
            type="monotone"
            dataKey="count"
            name="Problems Solved"
            stroke="#35c486"
            strokeWidth={2}
            dot={{ fill: '#35c486', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default UserProgressGraph;
