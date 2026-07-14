import React from 'react';
import { Box, Container, Link, Paper, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const sections = [
  {
    title: 'Information We Collect',
    body: [
      'When you apply to join the leaderboard, we collect the LeetCode username you submit, an optional GitHub username, an optional display name, and basic registration metadata such as the time the entry was created.',
      'The site also uses public LeetCode profile information and, if you provide a GitHub username, public GitHub contribution information to populate leaderboard views.',
    ],
  },
  {
    title: 'How We Use Information',
    body: [
      'We use submitted usernames to verify and review profiles, add approved users to the leaderboard, update public progress statistics, prevent duplicate entries, reduce spam, and keep the site working.',
      'We do not sell submitted usernames or use them for advertising.',
    ],
  },
  {
    title: 'Public Leaderboard Display',
    body: [
      'Leaderboard entries are public. Your display name, LeetCode username, LeetCode progress, and optional GitHub contribution stats may be visible to anyone who visits the site.',
      'Do not submit a username or display name that you do not want associated with the public leaderboard.',
    ],
  },
  {
    title: 'Service Providers',
    body: [
      'The site may use Cloudflare Workers KV, Cloudflare Workers, and optional Cloudflare Turnstile for hosting, storage, bot protection, and abuse prevention.',
      'The site also requests public profile data from LeetCode and GitHub when updating leaderboard data. Those services have their own privacy policies and terms.',
    ],
  },
  {
    title: 'Security and Retention',
    body: [
      'We use reasonable safeguards such as server-side validation, rate limits, bot checks, and restricted write endpoints. No website or storage system can be guaranteed perfectly secure.',
      'Pending submissions are kept while they await review and may be rejected or deleted. Approved leaderboard records are kept while the leaderboard is active unless removal is requested or maintenance requires cleanup.',
    ],
  },
  {
    title: 'Removal Requests',
    body: [
      'If you want your leaderboard entry removed or corrected, contact the site owner with the LeetCode username involved. Reasonable removal requests will be handled when practical.',
    ],
  },
  {
    title: 'Changes',
    body: [
      'This policy may be updated as the site changes. The effective date below indicates the latest revision.',
    ],
  },
];

function PrivacyPolicy() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 9 } }}>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, letterSpacing: '0.14em' }}>
          Legal
        </Typography>
        <Typography variant="h3" component="h1" sx={{ mt: 1 }}>
          Privacy Policy
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2, lineHeight: 1.65 }}>
          Effective July 14, 2026
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, bgcolor: 'rgba(13, 15, 18, 0.72)' }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
          This policy explains how Ray's LeetCode Leaderboard handles information for this leaderboard site. It is written for transparency and is not legal advice.
        </Typography>

        {sections.map((section) => (
          <Box key={section.title} sx={{ mt: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              {section.title}
            </Typography>
            {section.body.map((paragraph) => (
              <Typography key={paragraph} variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
                {paragraph}
              </Typography>
            ))}
          </Box>
        ))}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          See also the <Link component={RouterLink} to="/terms" color="inherit" underline="always">Terms of Use</Link>.
        </Typography>
      </Paper>
    </Container>
  );
}

export default PrivacyPolicy;
