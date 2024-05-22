var express = require('express');
let db = require('../db');
const { default: mongoose } = require('mongoose');

var router = express.Router();

const isAuthorised = (req, res, next) => {
  try {
    const userCollection = db.get().collection('USER');
    if (!req.session.user) {
      res.redirect('/auth/login');
    } else {
      if (req.session.user.status) {
        next();
      } else {
        res.redirect('/auth/login');
      }
    }
  } catch (error) {

  }
}

// Function to convert timestamp to DD/MM/YYYY format
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0'); // Get day and pad with leading zero if necessary
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month (zero-based) and pad with leading zero if necessary
  const year = date.getFullYear(); // Get full year
  return `${day}-${month}-${year}`;
}

// Function to add one day to a given timestamp and return the new date in DD/MM/YYYY format
function addOneDay(timestamp) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + 1); // Add one day
  const day = date.getDate().toString().padStart(2, '0'); // Get day and pad with leading zero if necessary
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month (zero-based) and pad with leading zero if necessary
  const year = date.getFullYear(); // Get full year
  return `${day}/${month}/${year}`;
}


module.exports = router;