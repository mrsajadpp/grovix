var express = require('express');
const { default: mongoose } = require('mongoose');
const User = require('../models/user');

var router = express.Router();

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

// Dashboard
router.get('/', isAuthorised, (req, res, next) => {
  res.render('dashboard/index', { title: "Dashboard", style: ['dashboard'], user: req.session.user ? req.session.user : false });
});

// Articles
router.get('/articles', isAuthorised, (req, res, next) => {
  res.render('dashboard/articles', { title: "Articles", style: ['dashboard'], user: req.session.user ? req.session.user : false });
});

module.exports = router;