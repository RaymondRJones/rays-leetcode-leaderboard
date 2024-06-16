import React, { useState } from 'react';
import { TextField, Button, Typography, Box } from '@mui/material';

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
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, textAlign: 'center' }}>
        How many Leetcode Coins Do You have Right Now?
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
        <Typography variant="body1" sx={{ mt: 2 }}>
          You need {monthsNeeded} months to get your Leetcode T-Shirt (Assuming you do all dailies and contests)
        </Typography>
      )}
    </Box>
  );
};

export default LeetcodeCoinCalculator;

