// index.js
const express = require('express');
const bodyParser = require('body-parser');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const client = new SecretManagerServiceClient();
const orgID = '110002141516';
const PROJECT_ID = process.env.GCP_PROJECT || 'zoho-books-integration-481515';
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
    {"customer_name":"test","payment_method":"cash","line_items":[{"name":"Beer","quantity":1,"rate":5.13}]},
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        organization_id: 110002141516,
      },
    }
  );
  return response.data;
}

app.get("/", async (req, res) => {
  res.send("Server is running!");


  const accessToken = await getZohoAccessToken(clientId, clientSecret, refreshToken);
  const result = await createSalesReceipt(accessToken, receiptData);
});


// Webhook endpoint for Square make sure to append /webhook to your deployed URL
//https://squaregooglecloudrunzohointegration-188911918304.northamerica-northeast2.run.app/webhook
app.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook received:', req.body);

    // Fetch Zoho secrets
   // const clientId = await getSecret('ZOHO_CLIENT_ID');
    // const clientSecret = await getSecret('ZOHO_CLIENT_SECRET');
   // const refreshToken = await getSecret('ZOHO_REFRESH_TOKEN');
    const clientId = '1000.FFWK1GZAWERDY5LPOP09T2BATX0BQJ';
    const clientSecret = '8f033198a9c5a4ab49e94c0c49ee8c9662ae93fa48';
    const refreshToken = '1000.69253ba57a70078e371cecac85e36fe8.54c4ecfb3d5df22ab5f014346adc0e47'
   

    // Get access token
    const accessToken = await getZohoAccessToken(clientId, clientSecret, refreshToken);

    // Example: map Square webhook data to Zoho sales receipt
    // Replace these IDs with actual Zoho customer/item IDs
   

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
