import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@mui/material';

// Replace 'pk_test_your_key_here' with your Stripe publishable key
const stripePromise = loadStripe('pk_test_51NRvW6BltQszbZOvAwbtkwNuE2tl0DtSWS5P4cfhXFiLmWrIsSEWQYxu557jgdYpgYPM8eU2n0IS1LThkwLPABnU00DstMEW0y');

const DonateButton = () => {
  const handleClick = async (event) => {
    // Prevent the default action
    event.preventDefault();
    
    // Your AWS Gateway URL
    const awsGatewayUrl = 'https://wkv9wkwxl7.execute-api.us-east-1.amazonaws.com/test/send_to_stripe/test';

    const stripe = await stripePromise;
    const response = await fetch(awsGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // You can pass additional body data as required by your Lambda function
      // body: JSON.stringify({ key: 'value' }),
    });
    const session = await response.json();
    console.log(session)
    const { sessionId } = JSON.parse(session.body); // This is where you extract sessionId
    console.log('Extracted sessionId:', sessionId);
    // Redirect to Stripe Checkout
    const result = await stripe.redirectToCheckout({
      sessionId: sessionId, // Make sure this matches the key from your Lambda response
    });

    if (result.error) {
      // If `redirectToCheckout` fails due to a browser or network
      // error, display the localized error message to your customer.
      alert(result.error.message);
    }
  };

  return (
    <Button variant="contained" color="secondary" onClick={handleClick}>
      Buy Premium Access
    </Button>
  );
};

export default DonateButton;
