// db.js
const mongoose = require('mongoose');
 
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/grovixlab');
    console.log('MongoDB connected');
  } catch (error) {
console.error(error);
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
