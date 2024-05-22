var express = require('express');
const crypash = require('crypash');
var router = express.Router();
const User = require('../models/user');
let mail = require('../mail/config');
var geoip = require('geoip-lite');
let axios = require('axios');

const { default: mongoose } = require('mongoose');

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

const isAdmin = (req, res, next) => {
  if (!req.session.user) {
    res.redirect('/auth/login');
  } else {
    if (!req.session.user.admin) {
      res.redirect('/');
    } else {
      next();
    }
  }
}

function generateOneTimeCode(string1, string2) {
  // Concatenate the two strings
  const combinedString = string1 + string2;

  // Generate a hash of the concatenated string using SHA256 algorithm
  const hash = crypto.createHash('sha256').update(combinedString).digest('hex');

  // Extract the first 6 characters of the hash to create the one-time code
  const oneTimeCode = hash.substring(0, 9);

  return oneTimeCode;
}


const isAuthorised = (req, res, next) => {
  try {
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

const isNotAuthorised = (req, res, next) => {
  try {
    if (req.session.user) {
      if (req.session.user.status) {
        res.redirect('/');
      } else {
        next();
      }
    } else {
      next();
    }
  } catch (error) {
    console.error("Error:", err);
  }
}


module.exports = router;
