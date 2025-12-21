// index.js
import express from 'express';
import bodyParser from 'body-parser';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import axios from 'axios';
//track processed orders to avoid duplicates
const processedOrders = new Set();
const app = express();
app.use(bodyParser.json());
import { google } from "googleapis";
const client = new SecretManagerServiceClient();
const globalVariablesSheetID= '1jhf1wM7X5aPjQOpIS8MVrKzU33g7iTH7tQx262_7UkA';

const PROJECT_ID = process.env.GCP_PROJECT || 'zoho-books-integration-481515';


const squareAccessToken = 'EAAAl4VyU8OvT4IeMGdH41E8YaIHqVSUwzqiIZhvvwQXqLHWHpa-zXbZFbGxyWSu';
const orgID = '110002141516';
const clientId = '1000.FFWK1GZAWERDY5LPOP09T2BATX0BQJ';
const clientSecret = '8f033198a9c5a4ab49e94c0c49ee8c9662ae93fa48';
const refreshToken = '1000.69253ba57a70078e371cecac85e36fe8.54c4ecfb3d5df22ab5f014346adc0e47'
const soundPayoutAmount = 50;
const doorPayoutAmount = 20;

// Helper: fetch secret from Google Secret Manager
async function getSecret(secretName) {
  const [version] = await client.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`,
  });
  return version.payload.data.toString('utf8');
}


function extractOrderID(orderDat){
  
   return (
    
    orderDat?.data?.object?.order_created?.order_id ||
    null
  );
}


async function getCell(spreadsheetId, cell) {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: cell, // e.g. "Config!B2"
  });

  return res.data.values?.[0]?.[0] ?? null;
}

async function setCell(spreadsheetId, range, value) {
    //range Sheet1!A1:C3"
    
    
    const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

    
    
    
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range, // e.g., "Sheet1!B2"
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[value]],
      },
    });
    return response.status === 200;
 
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

  // Safety check
  

    // Map line items to the Zoho format
  const lineItems = orderDat.order.line_items.map(item => ({
    name: item.name,
    quantity: parseInt(item.quantity, 10),     // convert string to integer
    rate: Number((item.base_price_money.amount / 100).toFixed(2))
    // convert cents to dollars
  }));

  // Construct Zoho receipt object
  const receiptData = {
    customer_id: '73925000000023273',
    payment_method: 'cash',
    line_items: lineItems
  };

  // Convert to JSON string
  console.log(JSON.stringify(receiptData).replace(/},/g, '}, '));
  return receiptData;
}




function calculateStaffPayout(orderDat){

  const lineItems = orderDat?.response?.order?.line_items || [];

 
  let totalPayout = 0;

  for (const item of lineItems) {
    const name = item.name?.toLowerCase() || "";
    const quantity = Number(item.quantity || 0);

    if (name.includes("doorpayout")) {
      totalPayout += doorPayoutAmount * quantity;
    }

    if (name.includes("soundpayout")) {
      totalPayout += soundPayoutAmount * quantity;
    }
  }

  return totalPayout;
}


 

function checkPayoutCost(orderDat){
  let contains = false;
  if( JSON.stringify(orderDat).includes("DoorPayout") || JSON.stringify(orderDat).includes("SoundPayout")){
    contains = true;
  }
  return contains;
// if line items contain either DoorPayout or SoundPayout return true

return true;

}
function checkContainsTickets(orderDat){
  //if line items contain ticket
  const lineItems = orderDat?.response?.order?.line_items || [];

  let ticketTotalCents = 0;

  for (const item of lineItems) {
    const name = item.name?.toLowerCase() || "";
    const quantity = Number(item.quantity || 0);

    // Adjust this condition if your ticket naming differs
    const isTicket = name.includes("ticket");

    if (!isTicket) continue;

    const rateCents =
      item.base_price_money?.amount ??
      item.variation_total_price_money?.amount ??
      0;

    ticketTotalCents += rateCents * quantity;
  }

  return ticketTotalCents / 100;
  };
  
function calculateArtistPayout(orderDat){


  
}

function checkCREDITorDEBIT(orderDat){
  const tenders = orderDat?.response?.order?.tenders || [];

  return tenders.some(tender => {
    const cardType = tender?.card_details?.card?.card_type;
    return cardType === "CREDIT" || cardType === "DEBIT";
  });
 
}


async function checkSheetDate(type){

  let dateCell = '';
  let amountCell = '';
  let account = '';
  if(type = 'Fees'){
    dateCell = 'Sheet1!B3';
    amountCell = 'Sheet1!C3';
    account = 'Square Fees';
  }else{
    dateCell = 'Sheet1!B2';
    amountCell = 'Sheet1!C2';
    account = 'Artist Payout';
  }
  let date = await getCell(globalVariablesSheetID, dateCell);
  //compare to date.now
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // months are 0-based
  const day = String(today.getDate()).padStart(2, '0');
  
  let todaysDate =  `${year}${month}${day}`;
  if(date != todaysDate){
//clear amount and set date to today and create expense in zoho for amount in cell
 await setCell(globalVariablesSheetID, dateCell, todaysDate);
 await setCell(globalVariablesSheetID, amountCell, 0);
    //create Expense
    createZohoExpense(account, await getCell(globalVariablesSheetID, amountCell), 'Square Fees', await getZohoAccessToken(clientId, clientSecret, refreshToken));
  }
}


function calculateSquareFees(orderDat){
  

}


async function createZohoExpense(catagoryID, amount,customer,accessToken){

const response = await axios.post(
    
  );

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
  
  console.log(receiptData);
  const response = await axios.post(
    'https://www.zohoapis.ca/books/v3/salesreceipts',
    null,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        organization_id: 110002141516,
        JSONString: JSON.stringify(receiptData),
      },
    }
  );
  return response.data;
}


//test response for root path
app.get("/", async (req, res) => {
  res.send("Server is running!");

  
  let receiptData = '{"customer_name":"test","payment_method":"cash","line_items":[{"name":"Beer","quantity":1,"rate":5.13}]}';
  const accessToken = await getZohoAccessToken(clientId, clientSecret, refreshToken);
  const result = await createSalesReceipt(accessToken, receiptData);
});


// Webhook endpoint for Square make sure to append /webhook to your deployed URL
//https://squaregooglecloudrunzohointegration-188911918304.northamerica-northeast2.run.app/webhook
app.post('/webhook', async (req, res) => {
  
    let orderDat = null;
    console.log("Received Webhook:", JSON.stringify(req.body).replace(/},/g, '}, '))
    //fetch order ID from hook
    const orderId = extractOrderID(req.body);
    console.log("Received Order ID:", orderId);
    res.status(200).send("Order ID not Found");
    //if no order ID return 400 exit function
    if (!orderId) {
      return res.status(200).send("Order ID not Found");
    }

       // Idempotency check
    if (processedOrders.has(orderId)) {
      console.log("Duplicate webhook ignored:", orderId);
      //end funtion due to duplciate order
      return;
    }else{ 
      processedOrders.add(orderId);
    }

    
    //fetch square OrderInfo
    orderDat = await fetchSquareOrder(orderId,process.env.SQUARE_ACCESS_TOKEN);
    //log order dat
    console.log("Square Order:", JSON.stringify(orderDat).replace(/},/g, '}, '));
    //respond sucess and continue processing
    //res.status(200).json({ success: true });
    //if error from try respond with 500
  


//continue function
if(checkPayoutCost((orderDat))){
  
  let totalPayout = calculateStaffPayout(orderDat);

  let accessToken = await getZohoAccessToken(clientId, clientSecret, refreshToken);

  let result = await createZohoExpense('Artist Payout', totalPayout, 'Dr. Artist', accessToken);

  return;
}


if(checkContainsTickets(orderDat)){
  //find proper function for date.now
  
  await checkSheetDate('Payout');

  let previousPayout = await getCell(globalVariablesSheetID, 'Sheet1!C2');
  //fetch row amount
  let payout = calculateArtistPayout(orderDat) + Number(previousPayout);
  //update row amount
  await setCell(globalVariablesSheetID, 'Sheet1!C2', payout);
 //update google sheets(maybe check date updated ect.)
}
  
if(checkCREDITorDEBIT(orderDat)){
const squareFees =   calculateSquareFees(orderDat);
if(squareFees > 0){
    checkSheetDate('Fees');
    
  let previousFees = await getCell(globalVariablesSheetID, 'Sheet1!C3');
  squareFees = squareFees + Number(previousFees);
  await setCell(globalVariablesSheetID, 'Sheet1!C3', squareFees);
}
}

let receiptData = parseOrderDat(orderDat);
let accessToken = await getZohoAccessToken(clientId, clientSecret, refreshToken);

try{
const result = await createSalesReceipt(accessToken, receiptData);
} catch (err) {
    console.error(
      "Could not create sales recipt:",
      err.response?.data || err.message
    );
    return;
  }

//return res.status(200).send("successfully created sales recipt");
});


// Start server

app.use(express.json());
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Server is running');
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
