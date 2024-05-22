var express = require('express');
const { default: mongoose } = require('mongoose');
const User = require('../models/user');
const Article = require('../models/article');

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
  res.render('dashboard/articles', { title: "Articles >> Dashboard", style: ['dashboard'], user: req.session.user ? req.session.user : false });
});

// bug area

router.get('/articles/pending', isAuthorised, async (req, res, next) => {
  try {
    const article_list = await Article.find({ author_id: req.session.user._id, status: false });
    console.log(article_list);
    res.render('dashboard/pending_articles', { title: "Articles >> Dashboard", style: ['dashboard'], article_list, user: req.session.user ? req.session.user : false });
  } catch (error) {
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
  }
});

// Earnings
router.get('/earnings', isAuthorised, (req, res, next) => {
  res.render('dashboard/earnings', { title: "Earnings >> Dashboard", style: ['dashboard', 'earnings'], user: req.session.user ? req.session.user : false });
});

// Notifications
router.get('/notifications', isAuthorised, (req, res, next) => {
  res.render('dashboard/notifications', { title: "Notifications >> Dashboard", style: ['dashboard'], user: req.session.user ? req.session.user : false });
});

// Settnigs
router.get('/settings', isAuthorised, (req, res, next) => {
  res.render('dashboard/settings', { title: "Settings >> Dashboard", style: ['dashboard', 'settings', 'regform'], user: req.session.user ? req.session.user : false });
});

router.get('/settings/payment', isAuthorised, (req, res, next) => {
  res.render('dashboard/payment', { title: "Payment >> Settings >> Dashboard", style: ['dashboard', 'settings', 'regform'], user: req.session.user ? req.session.user : false });
});

// New Article
router.get('/new', isAuthorised, (req, res, next) => {
  res.render('dashboard/new', { title: "New >> Article >> Dashboard", style: ['dashboard', 'regform'], user: req.session.user ? req.session.user : false });
});

module.exports = router;