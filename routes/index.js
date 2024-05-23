var express = require('express');
const User = require('../models/user');
const Article = require('../models/article');
let mongoose = require('mongoose');

var router = express.Router();

// Function to search products based on a query
function searchProducts(products, query) {
  // Convert query to lowercase for case-insensitive search
  const lowercaseQuery = query.toLowerCase();

  // Filter products based on query
  const result = products.filter(product => {
    // Convert product properties to lowercase for case-insensitive search
    const lowercaseName = product.name.toLowerCase();
    const lowercaseShortDescription = product.short_des.toLowerCase();
    const lowercaseDescription = product.description.toLowerCase();
    const lowercaseSKU = product.SKU.toLowerCase();
    const lowercasePrice = product.sale_price;

    // Check if any product property contains the query
    return (
      lowercaseName.includes(lowercaseQuery) ||
      lowercaseShortDescription.includes(lowercaseQuery) ||
      lowercaseDescription.includes(lowercaseQuery) ||
      lowercaseSKU.includes(lowercaseQuery) ||
      lowercasePrice.includes(lowercaseQuery)
    );
  });

  return result;
}

function formatDate(dateString) {
  const date = new Date(dateString);

  const options = { weekday: 'short', month: 'short', year: 'numeric' };
  const formattedDate = date.toLocaleDateString('en-US', options);

  const [weekday, month, year] = formattedDate.split(' ');
  return `${weekday}, ${month} ${year}`;
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

// Function to get the current date in YYYY-MM-DD format
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Home
router.get('/', (req, res, next) => {
  res.render('user/index', { title: "Grovix Lab", style: [], user: req.session.user ? req.session.user : false });
});

// Trending
router.get('/trending', (req, res, next) => {
  res.render('user/trending', { title: "Trending", style: [], user: req.session.user ? req.session.user : false });
});

// Categories
router.get('/categories', (req, res, next) => {
  res.render('user/categories', { title: "Category", style: [], user: req.session.user ? req.session.user : false });
});

// Signup
router.get('/auth/signup', isNotAuthorised, (req, res, next) => {
  res.render('user/signup', { title: "Signup", style: ['regform'], user: req.session.user ? req.session.user : false });
});

// login
router.get('/auth/login', isNotAuthorised, (req, res, next) => {
  res.render('user/login', { title: "Login", style: ['regform'], user: req.session.user ? req.session.user : false });
});

// Article
router.get('/page/:endpoint', async (req, res, next) => {
  try {
    let article = await Article.findOne({ endpoint: req.params.endpoint }).lean();
    if (article && article.status) {
      let author = await User.findOne({ _id: new mongoose.Types.ObjectId(article.author_id) }).lean();
      res.render('user/article', { title: article.title, style: ['article'], article: article, author, user: req.session.user ? req.session.user : false });
    } else {
      res.render('error', { title: "404", status: 404, message: "Not found", style: ['error'], user: req.session.user ? req.session.user : false });
    }
  } catch (error) {
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
  }
});

module.exports = router; 
