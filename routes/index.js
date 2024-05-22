var express = require('express');
const User = require('../models/user');
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


module.exports = router;
