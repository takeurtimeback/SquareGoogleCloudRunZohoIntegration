// index.js
const express = require('express');
const bodyParser = require('body-parser');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const client = new SecretManagerServiceClient();

const PROJECT_ID = process.env.GCP_PROJECT || 'zoho-books-integration-481515';
const ORG_ID = process.env.ZOHO_ORG_ID || '110002141516'; // Zoho Books Organization ID

const squareAccessToken = 'EAAAl4VyU8OvT4IeMGdH41E8YaIHqVSUwzqiIZhvvwQXqLHWHpa-zXbZFbGxyWSu';
const orgID = '110002141516';
const clientId = '1000.FFWK1GZAWERDY5LPOP09T2BATX0BQJ';
const clientSecret = '8f033198a9c5a4ab49e94c0c49ee8c9662ae93fa48';
const refreshToken = '1000.69253ba57a70078e371cecac85e36fe8.54c4ecfb3d5df22ab5f014346adc0e47'
// Helper: fetch secret from Google Secret Manager
async function getSecret(secretName) {
  const [version] = await client.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`,
  });
  return version.payload.data.toString('utf8');
}


function extractOrderID(orderDat){
   return (
    orderDat?.payload?.data?.object?.order_created?.order_id ||
    null
  );
}

async function fetchSquareOrder(orderId) {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  const response = await axios.get(
    `https://connect.squareup.com/v2/orders/${orderId}`,
    {
      headers: {
        "Square-Version": "2025-10-16",
        "Authorization": `Bearer ${squareAccessToken}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
}


function parseOrderDat(orderDat){



}

function checkPayoutCost(orderDat){
// if line items contain either DoorPayout or SoundPayout return true



}
function checkContainsTickets(orderDat){
  //if line items contain ticket

}
function calculateArtistPayout(orderDat){

}
function checkCREDITorDEBIT(orderDat){
 //if payments contain credit or debit
  return true;
}
function calculateSquareFees(orderDat){
  

}
function parseSquareDatToZohoDat(orderDat){

}
function fetchSheetsRow(sheetID, rowID){

}
function updateSheetsRow(sheetID, rowID, updateDat){
  
}


// Helper: get Zoho access token using refresh token
async function getZohoAccessToken(clientId, clientSecret, refreshToken) {
  const response = await axios.post(
    'https://accounts.zohocloud.ca/oauth/v2/token',
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
    'https://www.zohoapis.ca/books/v3/salesreceipts',
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

  
  receiptData = '{"customer_name":"test","payment_method":"cash","line_items":[{"name":"Beer","quantity":1,"rate":5.13}]}';
  const accessToken = await getZohoAccessToken(clientId, clientSecret, refreshToken);
  const result = await createSalesReceipt(accessToken, receiptData);
});


// Webhook endpoint for Square make sure to append /webhook to your deployed URL
//https://squaregooglecloudrunzohointegration-188911918304.northamerica-northeast2.run.app/webhook
app.post('/webhook', async (req, res) => {
  try {
    const orderId = extractOrderId(req.body);

    if (!orderId) {
      return res.status(400).send("Order ID not found");
    }

    const squareOrder = await fetchSquareOrder(
      orderId,
      process.env.SQUARE_ACCESS_TOKEN
    );

    console.log("Square Order:", JSON.stringify(squareOrder, null, 2));

    res.status(200).json({ success: true });

  } catch (err) {
    console.error(
      "Square API error:",
      err.response?.data || err.message
    );
    res.status(500).send("Failed to fetch Square order");
  }

});

// Start server

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
