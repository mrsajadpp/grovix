// db.js
const mongoose = require('mongoose');
 
const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.DB_STRING}/grovixlab`);
    console.log('MongoDB connected');
  } catch (error) {
console.error(error);
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
