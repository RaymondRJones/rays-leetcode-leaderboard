import React, { useEffect, useRef, useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';

const WORKER_URL = process.env.REACT_APP_API_URL || 'https://weathered-dream-8f83.rayjones2170.workers.dev';
const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;

const buildApiUrl = (path) => `${WORKER_URL.replace(/\/$/, '')}${path}`;

function TurnstileChallenge({ onVerify }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !containerRef.current) {
      return undefined;
    }

    let cancelled = false;

    const renderTurnstile = () => {
      if (cancelled || !window.turnstile || widgetIdRef.current !== null) {
        return;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: onVerify,
        'expired-callback': () => onVerify(''),
        'error-callback': () => onVerify('')
      });
    };

    if (!document.querySelector('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = renderTurnstile;
      document.body.appendChild(script);
    } else {
      renderTurnstile();
    }

    const interval = window.setInterval(renderTurnstile, 250);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [onVerify]);

  if (!TURNSTILE_SITE_KEY) {
    return null;
  }

  return <Box ref={containerRef} sx={{ minHeight: 65, width: '100%' }} />;
}

function RegisterForm() {
  const [formData, setFormData] = useState({
    leetcode_username: '',
    github_username: '',
    display_name: '',
    website: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

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

      if (TURNSTILE_SITE_KEY && !turnstileToken) {
        setStatus({ type: 'error', message: 'Please complete the verification challenge.' });
        setLoading(false);
        return;
      }

      const saveResponse = await fetch(buildApiUrl('/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leetcode_username: formData.leetcode_username,
          github_username: formData.github_username,
          display_name: formData.display_name,
          website: formData.website,
          turnstileToken
        })
      });

      const result = await saveResponse.json().catch(() => ({}));

      if (saveResponse.ok) {
        setStatus({ type: 'success', message: result.message || 'Registration successful! You will appear on the leaderboards after the next update.' });
        setFormData({ leetcode_username: '', github_username: '', display_name: '', website: '' });
        setTurnstileToken('');
        if (window.turnstile) {
          window.turnstile.reset();
        }
      } else {
        setStatus({ type: 'error', message: result.error || 'Failed to save registration. Please try again.' });
        if (window.turnstile) {
          window.turnstile.reset();
        }
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
        Your profile is verified before it is added.
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <TextField
          name="website"
          label="Website"
          value={formData.website}
          onChange={handleChange}
          tabIndex={-1}
          autoComplete="off"
          sx={{ display: 'none' }}
        />
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
          label="Display Name"
          variant="filled"
          value={formData.display_name}
          onChange={handleChange}
          sx={{ flex: 1, minWidth: 200, bgcolor: 'white', borderRadius: 1 }}
        />
        <TurnstileChallenge onVerify={setTurnstileToken} />
        <Button
          type="submit"
          variant="contained"
          disabled={loading || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
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
