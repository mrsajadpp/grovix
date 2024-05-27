var express = require('express');
var router = express.Router();
const User = require('../models/user');
const Code = require('../models/code');
const Article = require('../models/article');
const Updation = require('../models/updation');
const ArticleEditsBin = require('../models/editBin');
const { default: mongoose } = require('mongoose');
let fs = require('fs');

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

// Admin Home
router.get('/', isAdmin, async (req, res, next) => {
  try {
    res.render('admin/index', { title: "Admin", style: ['dashboard'], user: req.session && req.session.user ? req.session.user : false });
  } catch (error) {
    console.error(error);
    
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Articles
router.get('/articles', isAdmin, async (req, res, next) => {
  try {
    const article_list = await Article.find({ status: true }).lean();
    res.render('admin/articles', { title: "Articles >> Admin", style: ['dashboard'], article_list, user: req.session && req.session.user ? req.session.user : false });
  } catch (error) {
    console.error(error);
    
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

router.get('/articles/locked', isAdmin, async (req, res, next) => {
  try {
    const article_list = await Article.find({ status: 'locked' }).lean();
    res.render('admin/locked', { title: "Locked >> Articles >> Admin", style: ['dashboard'], article_list, user: req.session && req.session.user ? req.session.user : false });
  } catch (error) {
    console.error(error);
    
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

router.get('/articles/pending', isAdmin, async (req, res, next) => {
  try {
    const article_list = await Article.find({ status: false }).lean();
    res.render('admin/pending', { title: "Pending >> Articles >> Admin", style: ['dashboard'], article_list, user: req.session && req.session.user ? req.session.user : false });
  } catch (error) {
    console.error(error);
    
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Route to get pending article edits
router.get('/articles/edits', isAdmin, async (req, res, next) => {
  try {
    const article_list = await Updation.find({ status: 'pending' }).lean();
    res.render('admin/edits', {
      title: "Pending Edits >> Articles >> Admin",
      style: ['dashboard'],
      article_list,
      user: req.session && req.session.user ? req.session.user : false
    });
  } catch (error) {
    console.error(error);
    res.render('error', {
      title: "500",
      status: 500,
      message: error.message,
      style: ['error'],
      user: req.session && req.session.user ? req.session.user : false
    });
  }
});

// Route to preview article edit
router.get('/article/edits/prev/:updation_id', isAdmin, async (req, res, next) => {
  try {
    const updationId = req.params.updation_id;
    const updation = await Updation.findById(updationId).lean();
    const author = await User.findById(updation.author_id).lean();

    if (updation) {
      res.render('admin/preview', {
        title: "Preview Article Edit",
        style: ['dashboard', 'article'],
        article: updation, // Pass the updation details to the template
        author,
        user: req.session && req.session.user ? req.session.user : false
      });
    } else {
      res.render('error', { title: "404", status: 404, message: "Article edit not found", style: ['error'], user: req.session.user ? req.session.user : false });
    }
  } catch (error) {
    console.error(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
  }
});

// Route to preview article pending
router.get('/article/prev/:updation_id', isAdmin, async (req, res, next) => {
  try {
    const updationId = req.params.updation_id;
    const updation = await Article.findById(updationId).lean();
    const author = await User.findById(updation.author_id).lean();

    if (updation) {
      res.render('admin/preview', {
        title: "Preview Article Pending",
        style: ['dashboard', 'article'],
        article: updation, // Pass the updation details to the template
        auhtor,
        user: req.session && req.session.user ? req.session.user : false
      });
    } else {
      res.render('error', { title: "404", status: 404, message: "Article edit not found", style: ['error'], user: req.session.user ? req.session.user : false });
    }
  } catch (error) {
    console.error(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
  }
});

// Alert
router.get('/alert', isAdmin, async (req, res, next) => {
  try {
    res.render('admin/alert', { title: "Alert", style: ['dashboard', 'regform'], user: req.session && req.session.user ? req.session.user : false });
  } catch (error) {
    console.error(error);
    
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Users
router.get('/users', isAdmin, async (req, res, next) => {
  try {
    const user_list = await User.find({ _id: { $ne: new mongoose.Types.ObjectId(req.session.user._id) } }).lean();
    res.render('admin/users', { title: "Users >> Admin", style: ['dashboard'], user_list, totalUsers: user_list.length, user: req.session && req.session.user ? req.session.user : false });
  } catch (error) {
    console.error(error);
    
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

module.exports = router;
