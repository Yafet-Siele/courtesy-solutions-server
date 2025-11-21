require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");
const { sendToHubSpot } = require("./hubspot");


const calculatorModel = require('./models/calculatorData');
const clientModel = require('./models/client');
const Email = require('./models/email');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch((error) => console.error('Error connecting to MongoDB:', error));

// Initialize MailerSend
if (!process.env.MAILERSEND_API_KEY) {
  console.error("Error: MAILERSEND_API_KEY is missing in .env");
  process.exit(1);
}

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

// Function to send email using MailerSend template
const sendEmail = async (toEmail) => {
  if (!process.env.EMAIL_FROM || !process.env.MAILERSEND_TEMPLATE_ID) {
    throw new Error("EMAIL_FROM or MAILERSEND_TEMPLATE_ID is missing in .env");
  }

  const sender = new Sender(process.env.EMAIL_FROM, "Courtesy Solutions Cleaning");
  const recipient = new Recipient(toEmail);

  const emailParams = new EmailParams()
    .setFrom(sender)
    .setTo([recipient])
    .setTemplateId(process.env.MAILERSEND_TEMPLATE_ID)
    .setSubject("Courtesy Solutions Cleaning"); // <-- Required by MailerSend API

  try {
    const response = await mailerSend.email.send(emailParams);
    console.log(`Email sent successfully to ${toEmail}:`, response);
    return response;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

// Submit route
app.post('/submit', async (req, res) => {
  try {
    const { name, email, number, message, ...calculatorData } = req.body;

    const client = await clientModel.create({ name, email, number, message });

    let calculator = null;
    const requiredFields = [
      "areaSize",
      "numberOfBedrooms",
      "numberOfBathrooms",
      "selectedService",
      "extras",
      "estimatedCost"
    ];
    const hasAllFields = requiredFields.every(field => calculatorData[field] !== undefined);

    if (hasAllFields) {
      calculator = await calculatorModel.create(calculatorData);
    }

    if (email) {
      await sendEmail(email); // send via MailerSend template
    }

    await sendToHubSpot({ name, email, number, message });

    res.status(200).json({ message: 'Data submitted successfully', client, calculator });
  } catch (error) {
    console.error('Error submitting data:', error);
    res.status(500).json({ error: error.message || 'Failed to submit form and calculator data' });
  }
});

// Route to just send email
app.post('/email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Enter a valid email' });

    await sendEmail(email);

    await Email.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });

    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});


app.post('/test-hubspot', async (req, res) => {
  const { name, email, number, message } = req.body;

  try {
    const response = await sendToHubSpot({ name, email, number, message });
    res.json({ success: true, hubspotId: response.id || response.body.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.get('/', (req, res) => res.send('API is running!'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
