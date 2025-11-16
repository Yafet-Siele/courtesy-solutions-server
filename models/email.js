const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Email', emailSchema)