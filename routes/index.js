var express = require('express');
let db = require('../db/config');
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

// GET Home Page
router.get('/', async function (req, res, next) {
  try {
    const catCollection = db.get().collection('CATEGORY');
    const categories = await catCollection.find().toArray();
    const prodCollection = db.get().collection('PRODUCT');
    const products = await prodCollection.find({ status: 'ava' }).sort({ price: -1 }).toArray();
    console.log(products);
    const bannCollection = db.get().collection('BANNER');
    const banners = await bannCollection.find().toArray();
    res.render('user/index', { title: 'Explore Bags at Elegent Purse', description: "Find your new favorite! Elegent Purse has a stunning collection of totes, satchels, and crossbody bags.", keywords: "bags, handbags, purses, buy bags online, leather bags, designer bags, affordable handbags, stylish bags, high-quality bags, luxury handbags, durable bags, versatile bags, trendy bags, comfortable bags, tote bags, crossbody bags, clutch bags, satchel bags, hobo bags, backpacks, bucket bags, elegent purse", admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false, categories, products, banners })
  } catch (err) {
    console.error("Error inserting user:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});


// GET Search Page
router.post('/search', async function (req, res, next) {
  try {
    const query = req.body.query.toLowerCase().trim(); // Normalize query

    // Search for products
    const prodCollection = db.get().collection('PRODUCT');
    const products = await prodCollection.find().toArray();

    const results = await searchProducts(products, query);


    res.render('user/result', { title: `Search Results for '${req.body.query}'`, description: `Showing ${results.length} results for "${query}". Explore our collection for the perfect ${query}.`, keywords: results, admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false, results, q: req.body.query });
  } catch (err) {
    console.error("Error searching:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});

function minimizeString(inputString) {
  if (inputString.length > 24) {
    return inputString.substring(0, 24);
  } else {
    return inputString;
  }
}


// GET Product Page
router.get('/product/:prodId', async function (req, res, next) {
  try {
    console.log(minimizeString(req.params.prodId));
    const prodCollection = db.get().collection('PRODUCT');
    const product = await prodCollection.findOne({ _id: new mongoose.Types.ObjectId(minimizeString(req.params.prodId)) });
    if (product) {
      // Find similar products excluding the current product
      const similarProducts = await prodCollection.find({
        category: product.category,
        _id: { $ne: product._id } // Exclude current product ID
      }).toArray();
      res.render('user/product', { title: `${product.name}`, description: product.description, keywords: product.description, admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false, product, similarProducts, image: product._id })
    } else {
      res.render('user/product', { title: `No Product Found`, description: "No product matching your id criteria was found.", keywords: "No product matching your id criteria was found.", admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false })
    }
  } catch (err) {
    console.error("Error inserting user:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});

// GET Loggin Page
router.get('/auth/login', isNotAuthorised, async function (req, res, next) {
  try {
    res.render('user/login', { title: 'Login - Elegent Purse', description: "Login to your Elegent Purse account for a seamless shopping experience. Access your saved favorites, manage your orders, and enjoy faster checkouts.", keywords: "login, sign in, member login, account access, secure login, fast checkout, manage orders, wishlist access, exclusive benefits, Elegent Purse login, Elegent Purse member account", auth: true })
  } catch (err) {
    console.error("Error inserting user:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});

// GET SignUp Page
router.get('/auth/signup', isNotAuthorised, async function (req, res, next) {
  try {
    res.render('user/signup', {
      title: 'SignUp - Elegent Purse',
      description: "Sign up for an account to enjoy a personalized shopping experience and keep track of your purchases.",
      keywords: "signup, create account, register, new user, faster checkout, manage orders, save wishlist, exclusive benefits, personalized experience, Elegent Purse signup, Elegent Purse member account",
      auth: true
    })
  } catch (err) {
    console.error("Error inserting user:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});

// GET Forgot Page
router.get('/auth/recover', isNotAuthorised, async function (req, res, next) {
  try {
    res.render('user/forgot', { title: 'Reset Password - Elegent Purse', auth: true })
  } catch (err) {
    console.error("Error inserting user:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});

// GET Reset Page
router.get('/reset/:pageId', isNotAuthorised, async function (req, res, next) {
  try {
    const userCollection = db.get().collection('USER');
    const pageCollection = db.get().collection('PAGE');
    const pageExist = await pageCollection.findOne({ page_id: req.params.pageId });
    const userExist = await userCollection.findOne({ _id: pageExist.user_id });

    if (pageExist && pageExist.status) {

      const newPage = {
        user_id: userExist._id,
        page_id: req.params.pageId,
        status: false,
        timestamp: pageExist.timestamp
      }

      await pageCollection.updateOne({ user_id: userExist._id }, { $set: newPage });

      res.render('user/newpass', { title: 'Reset Password - Elegent Purse', page_id: newPage.page_id, auth: true });
    } else {
      res.redirect('/auth/login');
    }
  } catch (err) {
    console.error("Error inserting user:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});

// Serve the robots.txt content directly
router.get('/robots.txt', function (req, res) {
  const robotsTxtContent = `
      User-agent: *
      Allow: /*
      Allow: /product/*
      Disallow: /admin/*
      Disallow: /auth/recover
      Sitemap: https://elegentpurse.com/sitemap.xml
      Sitemap: https://elegentpurse.com/sitemap-products.xml
  `;
  res.type('text/plain')
  res.send(robotsTxtContent);
});

// Serve the sitemap.xml content directly
router.get('/sitemap.xml', async function (req, res) {
  const prodCollection = db.get().collection('PRODUCT');
  const products = await prodCollection.find().toArray();

  let urls = [
    "https://www.elegentpurse.com/",
    "https://www.elegentpurse.com/auth/login",
    "https://www.elegentpurse.com/auth/signup"
  ];

  // const xmlContent = generateXML(urls); // Assuming you have a function to generate XML content

  // Construct the sitemap XML structure
  let sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">`;

  urls.forEach(url => {
    sitemapXML += `
  <url>
    <loc>${url}</loc>
    <lastmod>${getCurrentDate()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  sitemapXML += `
</urlset>`;

  res.type('application/xml');
  res.send(sitemapXML);
});

// Serve the sitemap-products.xml content directly
router.get('/sitemap-products.xml', async function (req, res) {
  const prodCollection = db.get().collection('PRODUCT');
  const products = await prodCollection.find().toArray();

  let urls = [];

  products.forEach(product => {
    urls.push(`https://elegentpurse.com/product/${product._id}`);
  });

  // const xmlContent = generateXML(urls); // Assuming you have a function to generate XML content

  // Construct the sitemap XML structure
  let sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">`;

  urls.forEach(url => {
    sitemapXML += `
  <url>
    <loc>${url}</loc>
    <lastmod>${getCurrentDate()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  sitemapXML += `
</urlset>`;

  res.type('application/xml');
  res.send(sitemapXML);
});

// Function to get the current date in YYYY-MM-DD format
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


module.exports = router;
