const mongoose = require('mongoose');

let db;

async function connect(url) {
  try {
    const dbname = 'elegentpurse';
    await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    db = mongoose.connection.db;
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  }
}

function get() {
  if (!db) {
    throw new Error('Database connection not established.');
  }
  return db;
}

// (async () => {
//   try {
//     await connect();
//   } catch (err) {
//     console.error('Failed to connect to the database:', err);
//     process.exit(1);
//   }
// })();

module.exports = {
  connect,
  get
};
