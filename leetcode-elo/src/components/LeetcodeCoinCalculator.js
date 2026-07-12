import React, { useState } from 'react';
import { TextField, Button, Typography, Box, Card, CardContent, Chip } from '@mui/material';

const LeetcodeCoinCalculator = () => {
  const [coins, setCoins] = useState('');
  const [monthsNeeded, setMonthsNeeded] = useState(null);

  const calculateMonthsNeeded = () => {
    const priceOfShirt = 6000;
    const coinsNum = parseInt(coins);
    if (!isNaN(coinsNum) && coinsNum >= 0) {
      const months = Math.ceil((priceOfShirt - coinsNum) / 550);
      setMonthsNeeded(months);
    } else {
      setMonthsNeeded(null);
    }
  };

  return (
    <Box sx={{ width: 'min(720px, 100%)', mx: 'auto', py: { xs: 6, md: 9 }, px: 2 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, letterSpacing: '0.14em' }}>
          Rewards
        </Typography>
        <Typography variant="h3" sx={{ mt: 1 }}>
          LeetCode T-Shirt Calculator
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2, lineHeight: 1.65 }}>
          Estimate how long it will take to turn daily practice into enough coins for the shirt.
        </Typography>
      </Box>
      <Card variant="outlined">
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        How many LeetCode coins do you have right now?
      </Typography>
      <TextField
        variant="outlined"
        value={coins}
        onChange={e => setCoins(e.target.value)}
        sx={{ mb: 2, width: '100%' }}
      />
      <Button variant="contained" onClick={calculateMonthsNeeded} sx={{ width: '100%' }}>
        Calculate
      </Button>
      {monthsNeeded !== null && (
        <Box sx={{ mt: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'rgba(20, 23, 27, 0.72)' }}>
        <Chip label={`${monthsNeeded} month${monthsNeeded === 1 ? '' : 's'}`} color="primary" sx={{ mb: 1 }} />
        <Typography variant="body1">
          You need {monthsNeeded} months to get your Leetcode T-Shirt (Assuming you do all dailies and contests)
        </Typography>
        </Box>
      )}
      </CardContent>
      </Card>
    </Box>
  );
};

export default LeetcodeCoinCalculator;
