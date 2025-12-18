// index.js
const express = require('express');
const bodyParser = require('body-parser');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const axios = require('axios');
//track processed orders to avoid duplicates
const processedOrders = new Set();
const app = express();
app.use(bodyParser.json());

const client = new SecretManagerServiceClient();

const PROJECT_ID = process.env.GCP_PROJECT || 'zoho-books-integration-481515';


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

return true;

}
function checkContainsTickets(orderDat){
  //if line items contain ticket
  return true;

}
function calculateArtistPayout(orderDat){

}
function checkCREDITorDEBIT(orderDat){
 //if payments contain credit or debit
  return true;
}
function checkSheetDate(){

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


//test response for root path
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
    //fetch order ID from hook
    const orderId = extractOrderID(req.body);
    console.log("Received Order ID:", orderId);
    
    //if no order ID return 400 exit function
    if (!orderId) {
      return res.status(200).send("Order ID not Found");
    }

       // Idempotency check
    if (processedOrders.has(orderId)) {
      console.log("Duplicate webhook ignored:", orderId);
      //end funtion due to duplciate order
      return res.status(200).send("Already processed");
    }else{ 
      processedOrders.add(orderId);
    }

    
    //fetch square OrderInfo
    const orderDat = await fetchSquareOrder(orderId,process.env.SQUARE_ACCESS_TOKEN);
    //log order dat
    console.log("Square Order:", JSON.stringify(orderDat, null, 2));
    //respond sucess and continue processing
    //res.status(200).json({ success: true });
    //if error from try respond with 500
  } catch (err) {
    console.error(
      "Square API error:",
      err.response?.data || err.message
    );
    return res.status(200).send("failed to process");
  }


//continue function
if(checkPayoutCost((orderDat))){
  //create expense in zoho
  return res.status(200).send("was a payout, done");
}
if(checkContainsTickets(orderDat)){
  //find proper function for date.now
  if(checkSheetDate()){
    //check if date is not today
    //if not update sheet clear amount and set date to day
  }


  //fetch row amount
  calculateArtistPayout(orderDat);
  //update row amount


 //update google sheets(maybe check date updated ect.)
}
  
if(checkCREDITorDEBIT(orderDat)){
const squareFees =   calculateSquareFees(orderDat);
if(squareFees > 0){
  if(checkSheetDate()){
    //check if date is not today
    //if not update sheet clear amount and set date to day
    //fetch row
  //update row
  }
}
}

receiptData = parseOrderDat(orderDat);
try{
const accessToken = await getZohoAccessToken(clientId, clientSecret, refreshToken);
} catch (err) {
    console.error(
      "Auth Token Retrieval error:",
      err.response?.data || err.message
    );
    return res.status(200).send("failed to gather acess token from zoho"); 
  }
if(!accessToken){
    return res.status(200).send("failed to gather acess token from zoho");
  }

try{
const result = await createSalesReceipt(accessToken, receiptData);
} catch (err) {
    console.error(
      "Could not create sales recipt:",
      err.response?.data || err.message
    );
    return res.status(200).send("failed to create sales recipt");;
  }

return res.status(200).send("successfully created sales recipt");
});


// Start server

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
