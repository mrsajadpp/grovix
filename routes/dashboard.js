var express = require('express');
const { default: mongoose } = require('mongoose');
const User = require('../models/user');
const Article = require('../models/article');
const Updation = require('../models/updation');  

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
    console.error(error);

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
  res.render('dashboard/index', { title: "Dashboard", style: ['dashboard'], user: req.session && req.session.user ? req.session.user : false });
});

// Articles
router.get('/articles', isAuthorised, async (req, res, next) => {
  const article_list = await Article.find({ author_id: req.session.user._id, status: true }).lean();
  res.render('dashboard/articles', { title: "Articles >> Dashboard", style: ['dashboard'], article_list, user: req.session && req.session.user ? req.session.user : false });
});

router.get('/articles/pending', isAuthorised, async (req, res, next) => {
  try {
    const article_list = await Article.find({ author_id: req.session.user._id, status: false }).lean();
    res.render('dashboard/pending_articles', { title: "Articles >> Dashboard", style: ['dashboard'], article_list, user: req.session && req.session.user ? req.session.user : false });
  } catch (error) {
    console.error(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Earnings
router.get('/earnings', isAuthorised, async (req, res, next) => {
  try {
    const article_list = await Article.find({ author_id: req.session.user._id, status: true }).lean();
    const total_views = article_list.reduce((sum, article) => sum + (article.views || 0), 0);
    const views_graph = (total_views / 20000) * 100;
    const articles_graph = (article_list.length / 15) * 100;
    res.render('dashboard/earnings', { title: "Earnings >> Dashboard", style: ['dashboard', 'earnings'], articles_graph, views_graph, articles: 15 - article_list.length, views: 20000 - total_views, user: req.session && req.session.user ? req.session.user : false });
  } catch (error) {
    console.error(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Notifications
router.get('/notifications', isAuthorised, (req, res, next) => {
  res.render('dashboard/notifications', { title: "Notifications >> Dashboard", style: ['dashboard'], user: req.session && req.session.user ? req.session.user : false });
});

// Settnigs
router.get('/settings', isAuthorised, (req, res, next) => {
  res.render('dashboard/settings', { title: "Settings >> Dashboard", style: ['dashboard', 'settings', 'regform'], user: req.session && req.session.user ? req.session.user : false });
});

router.get('/settings/payment', isAuthorised, (req, res, next) => {
  res.render('dashboard/payment', { title: "Payment >> Settings >> Dashboard", style: ['dashboard', 'settings', 'regform'], user: req.session && req.session.user ? req.session.user : false });
});

// New Article
router.get('/new', isAuthorised, (req, res, next) => {
  res.render('dashboard/new', { title: "New >> Article >> Dashboard", style: ['dashboard', 'regform'], user: req.session && req.session.user ? req.session.user : false });
});

// Edit Article
router.get('/edit/:article_id', isAuthorised, async (req, res, next) => {
  try {
    let article = await Article.findOne({ _id: new mongoose.Types.ObjectId(req.params.article_id), author_id: req.session.user._id }).lean();
    res.render('dashboard/edit', { title: article.title, style: ['dashboard', 'regform'], article, user: req.session && req.session.user ? req.session.user : false });
  } catch (error) {
    console.error(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

module.exports = router;