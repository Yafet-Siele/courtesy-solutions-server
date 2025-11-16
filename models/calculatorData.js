// server/models/calculatorData.js
const mongoose = require('mongoose');

const calculatorDataSchema = new mongoose.Schema({
  areaSize: { type: Number, required: true },
  numberOfBedrooms: { type: Number, required: true },
  numberOfBathrooms: { type: Number, required: true },
  selectedService: { type: String, required: true },
  extras: { type: Object, required: true },
  estimatedCost: { type: Number, required: true },
}, { timestamps: true });

const calculatorModel = mongoose.model('CalculatorData', calculatorDataSchema);
module.exports = calculatorModel;
