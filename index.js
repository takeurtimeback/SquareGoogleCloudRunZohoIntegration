const express = require('express');
const bodyParser = require('body-parser');

const app = express();


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use(bodyParser.json());

app.post('/square-webhook', (req, res) => {
    console.log('Received webhook:', req.body);
    res.status(200).send('Webhook received');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
