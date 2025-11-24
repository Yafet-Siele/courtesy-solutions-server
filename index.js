require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
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
const mailerSend = process.env.MAILERSEND_API_KEY 
  ? new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY })
  : null;

// Initialize Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // e.g., 'smtp.gmail.com'
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Function to send email using Nodemailer
const sendEmailWithNodemailer = async (toEmail) => {
  const mailOptions = {
    from: `"Courtesy Solutions Cleaning" <${process.env.EMAIL_FROM}>`,
    to: toEmail,
    subject: 'Courtesy Solutions Cleaning',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 10px; font-size: 12px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You for Contacting Us!</h1>
            </div>
            <div class="content">
              <p>Dear Customer,</p>
              <p>Thank you for reaching out to Courtesy Solutions Cleaning. We've received your inquiry and will get back to you shortly.</p>
              <p>Our team is committed to providing you with the best cleaning solutions tailored to your needs.</p>
              <p>Best regards,<br>Courtesy Solutions Cleaning Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Courtesy Solutions Cleaning. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${toEmail} via Nodemailer:`, info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email with Nodemailer:", error);
    throw error;
  }
};

// Function to send email using MailerSend template
const sendEmailWithMailerSend = async (toEmail) => {
  if (!process.env.EMAIL_FROM || !process.env.MAILERSEND_TEMPLATE_ID) {
    throw new Error("EMAIL_FROM or MAILERSEND_TEMPLATE_ID is missing in .env");
  }

  const sender = new Sender(process.env.EMAIL_FROM, "Courtesy Solutions Cleaning");
  const recipient = new Recipient(toEmail);

  const emailParams = new EmailParams()
    .setFrom(sender)
    .setTo([recipient])
    .setTemplateId(process.env.MAILERSEND_TEMPLATE_ID)
    .setSubject("Courtesy Solutions Cleaning");

  try {
    const response = await mailerSend.email.send(emailParams);
    console.log(`Email sent successfully to ${toEmail} via MailerSend:`, response);
    return response;
  } catch (error) {
    console.error("Error sending email with MailerSend:", error);
    throw error;
  }
};

// Unified email sending function with fallback
const sendEmail = async (toEmail) => {
  // Try MailerSend first if available
  if (mailerSend && process.env.MAILERSEND_TEMPLATE_ID) {
    try {
      return await sendEmailWithMailerSend(toEmail);
    } catch (error) {
      // If MailerSend fails (e.g., trial limit), fall back to Nodemailer
      console.log("MailerSend failed, falling back to Nodemailer...");
      if (error.statusCode === 422 && error.body?.message?.includes('trial account')) {
        console.warn("MailerSend trial limit reached. Using Nodemailer instead.");
      }
    }
  }

  // Use Nodemailer as fallback or primary method
  return await sendEmailWithNodemailer(toEmail);
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
      await sendEmail(email);
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

app.get('/', (req, res) => res.send('API is running!'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));