var express = require('express');
const User = require('../models/user');
const Article = require('../models/article');
const Page = require('../models/page');
let mongoose = require('mongoose');
const SitemapGenerator = require('sitemap-generator');

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
    console.error(error);
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
  res.render('user/index', { title: "Earn by Writing Articles | Grovix Lab - Your Online Writing Platform", description: "Join Grovix Lab to earn money by writing articles online. Our platform connects talented writers with businesses seeking quality content. Boost your income by crafting engaging, high-quality articles on diverse topics.", url: 'https://www.grovixlab.com/', style: [], user: req.session && req.session.user ? req.session.user : false });
});

// Trending
router.get('/trending', (req, res, next) => {
  res.render('user/trending', { title: "Trending Articles Insights", description: "Discover top trending articles on Grovix Lab. Stay updated with the latest insights and popular content across various topics.", url: 'https://www.grovixlab.com/trending', style: [], user: req.session && req.session.user ? req.session.user : false });
});

// Categories
router.get('/categories', (req, res, next) => {
  res.render('user/categories', { title: "Article Categories, Explore Diverse Topics on Grovix Lab", description: "Explore diverse article categories on Grovix Lab. Find and read content on various topics tailored to your interests.", url: 'https://www.grovixlab.com/categories', style: [], user: req.session && req.session.user ? req.session.user : false });
});

// Signup
router.get('/auth/signup', isNotAuthorised, (req, res, next) => {
  res.render('user/signup', { title: "Join Grovix Lab", description: "Join Grovix Lab today and start earning by writing articles. Sign up now to connect with businesses and boost your income with quality content.", url: 'https://www.grovixlab.com/auth/signup', style: ['regform'], user: req.session && req.session.user ? req.session.user : false });
});

// login
router.get('/auth/login', isNotAuthorised, (req, res, next) => {
  res.render('user/login', { title: "Login to Grovix Lab", description: "Login to Grovix Lab to access your writing dashboard. Manage your articles, track your earnings, and connect with clients seamlessly.", url: 'https://www.grovixlab.com/auth/login', style: ['regform'], user: req.session && req.session.user ? req.session.user : false });
});

// Recovery
router.get('/auth/recover', isNotAuthorised, (req, res, next) => {
  res.render('user/forgot', { title: "Recover Account", url: 'https://www.grovixlab.com/auth/recover', style: ['regform'], user: req.session && req.session.user ? req.session.user : false });
});

// Article
router.get('/page/:endpoint', async (req, res, next) => {
  try {
    let article = await Article.findOneAndUpdate(
      { endpoint: req.params.endpoint, status: true },
      { $inc: { views: 1 } }, // Increment the views field by 1
      { new: true } // Return the updated document
    ).lean();

    if (article) {
      let author = await User.findOne({ _id: new mongoose.Types.ObjectId(article.author_id) }).lean();
      res.render('user/article', {
        title: article.title,
        style: ['article'],
        article: article,
        author,
        url: `https://www.grovixlab.com/page/${article.endpoint}`,
        user: req.session && req.session.user ? req.session.user : false
      });
    } else {
      res.render('error', {
        title: "404",
        status: 404,
        message: "Not found",
        style: ['error'],
        user: req.session && req.session.user ? req.session.user : false
      });
    }
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


// Recover Page
router.get('/reset/:page_id', isNotAuthorised, async (req, res, next) => {
  try {
    const pageId = new mongoose.Types.ObjectId(req.params.page_id);
    const page = await Page.findOne({ _id: pageId, status: true }).lean();

    if (!page) {
      throw new Error('Invalid or expired reset link.');
    }

    const user = await User.findOne({ _id: new mongoose.Types.ObjectId(page.user_id) }).lean();

    if (user) {
      const newPage = await Page.findById(page._id);
      newPage.status = false;
      await newPage.save();

      res.render('user/reset', {
        title: "New Password",
        style: ['regform'],
        user,
        url: `https://www.grovixlab.com/reset/${req.params.page_id}`,
        sessionUser: req.session && req.session.user ? req.session.user : false,
      });
    } else {
      throw new Error('User not found.');
    }
  } catch (error) {
    console.error(error);
    console.error(error);
    res.render('error', {
      title: "500",
      status: 500,
      message: error.message,
      style: ['error'],
      user: req.session && req.session.user ? req.session.user : false,
    });
  }
});

// Articles Sitemap.xml
router.get('/articles.xml', async (req, res, next) => {
  try {
    const article_list = await Article.find({ status: true }).lean();
    res.type('text/xml');
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset
          xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${article_list.map(article => {
      const lastmod = article.updatedAt ? new Date(article.updatedAt).toISOString() : new Date().toISOString();
      return `
  <url>
    <loc>https://www.grovixlab.com/page/${article.endpoint}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`;
    }).join('')}
</urlset>`;

    res.send(xmlContent);
  } catch (error) {
    console.error(error);

    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Sitemap.xml
router.get('/sitemap.xml', async (req, res, next) => {
  try {
    res.type('text/xml');
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset
          xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
    
    
    <url>
      <loc>https://www.grovixlab.com/</loc>
      <lastmod>2024-05-29T13:48:27+00:00</lastmod>
      <priority>1.00</priority>
    </url>
    <url>
      <loc>https://www.grovixlab.com/trending</loc>
      <lastmod>2024-05-29T13:48:27+00:00</lastmod>
      <priority>0.80</priority>
    </url>
    <url>
      <loc>https://www.grovixlab.com/categories</loc>
      <lastmod>2024-05-29T13:48:27+00:00</lastmod>
      <priority>0.80</priority>
    </url>
    <url>
      <loc>https://www.grovixlab.com/auth/signup</loc>
      <lastmod>2024-05-29T13:48:27+00:00</lastmod>
      <priority>0.80</priority>
    </url>
    <url>
      <loc>https://www.grovixlab.com/auth/login</loc>
      <lastmod>2024-05-29T13:48:27+00:00</lastmod>
      <priority>0.80</priority>
    </url>
    <url>
      <loc>https://www.grovixlab.com/auth/recover</loc>
      <lastmod>2024-05-29T13:48:27+00:00</lastmod>
      <priority>0.64</priority>
    </url>
    
    
    </urlset>`;

    res.send(xmlContent);
  } catch (error) {
    console.error(error);

    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Get famous top writer author details based on article views and total article amount
// router.get('/top-writers', async (req, res, next) => {
//   try {
//     // Aggregate articles to get the total views per author
//     const topAuthors = await Article.aggregate([
//       { $match: { status: true } },
//       {
//         $group: {
//           _id: "$author_id",
//           totalViews: { $sum: "$views" },
//           articleCount: { $sum: 1 }
//         }
//       },
//       { $sort: { totalViews: -1 } },
//       { $limit: 10 } // Limit to top 10 authors
//     ]);

//     // Fetch the user details for the top authors
//     const topWriters = await Promise.all(topAuthors.map(async author => {
//       const user = await User.findById(author._id).lean();
//       return {
//         ...user,
//         totalViews: author.totalViews,
//         articleCount: author.articleCount
//       };
//     }));

//     res.json(topWriters)
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Internal Server Error');
//   }
// });

// Robots.txt
router.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

module.exports = router; 
