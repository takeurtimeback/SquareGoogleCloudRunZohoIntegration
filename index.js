const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();

// Parse JSON payloads
app.use(bodyParser.json());

// Test endpoint to verify Cloud Run deployment
app.get('/', (req, res) => {
  res.send('Server is up and running!');
});

// Square webhook endpoint
app.post('/webhook', async (req, res) => {
  const event = req.body;
  console.log('Received Square webhook:', event);

  try {
    // Example: send the data to Zoho Books (replace with your URL & auth)
    // await axios.post('https://books.zoho.com/api/v3/salesreceipts', event, {
    //   headers: {
    //     'Authorization': 'Zoho-oauthtoken YOUR_OAUTH_TOKEN',
    //     'Content-Type': 'application/json'
    //   }
    // });

    // Acknowledge receipt to Square
    res.status(200).send('Webhook received successfully');
  } catch (error) {
    console.error('Error sending to Zoho:', error.message);
    res.status(500).send('Error processing webhook');
  }
});

// Start server (Cloud Run requires process.env.PORT)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
