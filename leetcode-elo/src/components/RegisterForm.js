import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';

const WORKER_URL = process.env.REACT_APP_API_URL || 'https://weathered-dream-8f83.rayjones2170.workers.dev';

function RegisterForm() {
  const [formData, setFormData] = useState({
    leetcode_username: '',
    github_username: '',
    display_name: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // Validate required fields
      if (!formData.leetcode_username || !formData.github_username) {
        setStatus({ type: 'error', message: 'LeetCode and GitHub usernames are required' });
        setLoading(false);
        return;
      }

      // Get existing users from KV
      const getUsersResponse = await fetch(`${WORKER_URL}?key=users:list`);
      const getUsersData = await getUsersResponse.json();

      let users = [];
      if (getUsersData.value && getUsersData.value !== 'null') {
        try {
          users = JSON.parse(getUsersData.value);
        } catch (e) {
          users = [];
        }
      }

      // Check for duplicates
      const exists = users.some(u =>
        u.leetcode_username === formData.leetcode_username ||
        u.github_username === formData.github_username
      );

      if (exists) {
        setStatus({ type: 'error', message: 'User already registered with this LeetCode or GitHub username' });
        setLoading(false);
        return;
      }

      // Add new user
      const newUser = {
        id: crypto.randomUUID(),
        leetcode_username: formData.leetcode_username,
        github_username: formData.github_username,
        display_name: formData.display_name || formData.leetcode_username,
        created_at: new Date().toISOString()
      };

      users.push(newUser);

      // Save to KV
      const saveResponse = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'users:list',
          value: JSON.stringify(users)
        })
      });

      if (saveResponse.ok) {
        setStatus({ type: 'success', message: 'Registration successful! You will appear on the leaderboards after the next update.' });
        setFormData({ leetcode_username: '', github_username: '', display_name: '' });
      } else {
        setStatus({ type: 'error', message: 'Failed to save registration. Please try again.' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4, bgcolor: 'primary.light', color: 'white' }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
        Join the Leaderboard!
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Register to track your LeetCode and GitHub progress
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <TextField
          name="leetcode_username"
          label="LeetCode Username"
          variant="filled"
          required
          value={formData.leetcode_username}
          onChange={handleChange}
          sx={{ flex: 1, minWidth: 200, bgcolor: 'white', borderRadius: 1 }}
        />
        <TextField
          name="github_username"
          label="GitHub Username"
          variant="filled"
          required
          value={formData.github_username}
          onChange={handleChange}
          sx={{ flex: 1, minWidth: 200, bgcolor: 'white', borderRadius: 1 }}
        />
        <TextField
          name="display_name"
          label="Display Name (Optional)"
          variant="filled"
          value={formData.display_name}
          onChange={handleChange}
          sx={{ flex: 1, minWidth: 200, bgcolor: 'white', borderRadius: 1 }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' }, height: 56 }}
        >
          {loading ? 'Registering...' : 'Register'}
        </Button>
      </Box>

      {status.message && (
        <Alert severity={status.type} sx={{ mt: 2 }}>
          {status.message}
        </Alert>
      )}
    </Paper>
  );
}

export default RegisterForm;
