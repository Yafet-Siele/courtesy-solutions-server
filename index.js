require('dotenv').config();
express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const calculatorModel = require('./models/calculatorData')
const clientModel = require('./models/client');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch((error) => console.error('Error connecting to MongoDB:', error));

app.post('/submit', async (req, res) => {
  try {
    const { name, email, number, message, ...calculatorData } = req.body;

    const client = await clientModel.create({ name, email, number, message });

    let calculator = null;
    if (calculatorData && Object.keys(calculatorData).length > 0) {
      calculator = await calculatorModel.create(calculatorData);
    }

    res.status(200).json({
      message: 'Data submitted successfully',
      client,
      calculator
    });
  } catch (error) {
    console.error('❌ Error submitting data:', error);
    res.status(500).json({ error: 'Failed to submit form and calculator data' });
  }
});

const Email = require('./models/email');


const nodemailer = require('nodemailer');

// Configure Nodemailer transport using Gmail (you can use other email providers too)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASSWORD, // Your Gmail password or App password (recommended)
  },
});

// Function to send email
const sendEmail = (email) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,  // Sender's email address
    to: email,                    // Recipient's email address
    subject: 'Courtesy Solutions Cleaning',
    text: 'Thank you for contacting us!\n\nWe have received your request and will get back to you shortly.',
  };

  return transporter.sendMail(mailOptions);
};

app.post('/email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Enter a valid email' });
    }

    // Send the email first
    await sendEmail(email);

    // Insert or update email in the database (ignoring duplicates)
    await Email.updateOne(
      { email },  
      { $setOnInsert: { email } },
      { upsert: true }
    );

    res.status(200).json({
      message: "Email processed and sent successfully"
    });
  } catch (error) {
    console.error('Error processing email:', error);
    res.status(500).json({ error: 'Failed to process your email' });
  }
});



app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
