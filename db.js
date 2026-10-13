require('dotenv').config();

const mongoose = require('mongoose');

const dbURI = process.env.MONGO_URI;

if (!dbURI) {
    console.error('MONGO_URI is missing. Please add it to the .env file.');
    process.exit(1);
}

mongoose.connect(dbURI)
    .then(() => {
        console.log('MongoDB connected');
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err.message);
    });