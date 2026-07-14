import React from 'react';
import { Box, Container, Link, Paper, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const sections = [
  {
    title: 'Use of the Site',
    body: [
      'This site is a community leaderboard for tracking coding practice. You may use it for personal, educational, and community challenge purposes.',
      'You agree not to attack, scrape abusively, spam, manipulate, or interfere with the site, its hosting provider, or its data sources.',
    ],
  },
  {
    title: 'Self-Registration',
    body: [
      'When you submit a LeetCode username, you confirm that you have the right to submit it and that the information is not abusive, misleading, or impersonating someone else.',
      'Submitting a profile does not guarantee acceptance. New submissions remain pending until the site owner reviews and approves or rejects them.',
      'GitHub usernames are optional. If provided, they may be used to show public contribution statistics.',
    ],
  },
  {
    title: 'Public Data and Third-Party Services',
    body: [
      'Leaderboard rankings depend on public or submitted profile information from LeetCode, GitHub, and the site database. Data can be delayed, incomplete, or unavailable.',
      'This site is not affiliated with, endorsed by, or sponsored by LeetCode, GitHub, or Cloudflare.',
    ],
  },
  {
    title: 'Moderation and Removal',
    body: [
      'The site owner may reject, edit, hide, or remove entries that appear abusive, duplicate, inaccurate, automated, or otherwise harmful to the leaderboard.',
      'Removal may also happen during maintenance, migrations, or challenge resets.',
    ],
  },
  {
    title: 'No Warranty',
    body: [
      'The site is provided as-is and as-available. It may contain bugs, outages, stale data, or ranking errors.',
      'You should not rely on the leaderboard for employment, academic, financial, legal, or other high-stakes decisions.',
    ],
  },
  {
    title: 'Limitation of Liability',
    body: [
      'To the fullest extent allowed by law, the site owner is not responsible for indirect, incidental, consequential, special, or punitive damages arising from use of the site.',
    ],
  },
  {
    title: 'Changes',
    body: [
      'These terms may be updated as the site changes. Continued use after updates means you accept the revised terms.',
    ],
  },
];

function TermsOfUse() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 9 } }}>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, letterSpacing: '0.14em' }}>
          Legal
        </Typography>
        <Typography variant="h3" component="h1" sx={{ mt: 1 }}>
          Terms of Use
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2, lineHeight: 1.65 }}>
          Effective July 14, 2026
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, bgcolor: 'rgba(13, 15, 18, 0.72)' }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
          These terms are practical rules for using Ray's LeetCode Leaderboard. They are written for transparency and are not legal advice.
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
          See also the <Link component={RouterLink} to="/privacy" color="inherit" underline="always">Privacy Policy</Link>.
        </Typography>
      </Paper>
    </Container>
  );
}

export default TermsOfUse;
