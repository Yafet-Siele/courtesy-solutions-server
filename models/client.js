const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  number: { type: String, required: true },
  message: { type: String, required: false }
}, { timestamps: true });

const clientModel = mongoose.model('Clients', clientSchema);  
module.exports = clientModel;