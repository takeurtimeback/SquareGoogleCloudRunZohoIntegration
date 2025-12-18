// index.js
const express = require('express');
const bodyParser = require('body-parser');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const client = new SecretManagerServiceClient();
const PROJECT_ID = process.env.GCP_PROJECT || zoho-books-integration-481515;
const ORG_ID = process.env.ZOHO_ORG_ID || '110002141516'; // Zoho Books Organization ID

// Helper: fetch secret from Google Secret Manager
async function getSecret(secretName) {
  const [version] = await client.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`,
  });
  return version.payload.data.toString('utf8');
}

// Helper: get Zoho access token using refresh token
async function getZohoAccessToken(clientId, clientSecret, refreshToken) {
  const response = await axios.post(
    'https://accounts.zoho.com/oauth/v2/token',
    null,
    {
      params: {
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      },
    }
  );
  return response.data.access_token;
}

// Helper: create sales receipt in Zoho Books
async function createSalesReceipt(accessToken, receiptData) {
  const response = await axios.post(
    'https://books.zoho.com/api/v3/salesreceipts',
    receiptData,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        organization_id: ORG_ID,
      },
    }
  );
  return response.data;
}

// Webhook endpoint for Square
app.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook received:', req.body);

    // Fetch Zoho secrets
    const clientId = await getSecret('ZOHO_CLIENT_ID');
    const clientSecret = await getSecret('ZOHO_CLIENT_SECRET');
    const refreshToken = await getSecret('ZOHO_REFRESH_TOKEN');

    // Get access token
    const accessToken = await getZohoAccessToken(clientId, clientSecret, refreshToken);

    // Example: map Square webhook data to Zoho sales receipt
    // Replace these IDs with actual Zoho customer/item IDs
    const receiptData = {
      customer_id: '123456789',
      line_items: [
        {
          item_id: '987654321',
          quantity: 1,
          rate: 10,
        },
      ],
      payment_option: 'Cash',
      // Optional: add notes or reference from Square webhook
      notes: `Square transaction: ${req.body.data?.object?.payment?.id || 'N/A'}`,
    };

    // Create the sales receipt
    const result = await createSalesReceipt(accessToken, receiptData);

    console.log('Sales receipt created:', result);
    res.status(200).send({ success: true, zohoResponse: result });
  } catch (error) {
    console.error('Error processing webhook:', error.response?.data || error.message);
    res.status(500).send({ success: false, error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
