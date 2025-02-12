// db.js
const mongoose = require('mongoose');
 
const connectDB = async () => {
  try {
    mongoose.connection.on('connected', function() {
      // Hack the database back to the right one, because when using mongodb+srv as protocol.
      if (mongoose.connection.client.s.url.startsWith('mongodb+srv')) {
          mongoose.connection.db = mongoose.connection.client.db('grovixlab');
      }
      console.log('Connection to MongoDB established.')
  }); 
    await mongoose.connect(`${process.env.DB_STRING}`); 
    console.log('MongoDB connected');
  } catch (error) {
console.error(error);
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
