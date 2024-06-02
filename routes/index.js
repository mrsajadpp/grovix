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

// Function to calculate keyword relevance
// function calculateKeywordRelevance(article, keywords) {
//   let relevance = 0;
//   const content = `${article.title} ${article.description} ${article.body}`.toLowerCase();

//   keywords.forEach(keyword => {
//     const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
//     const matches = content.match(regex);
//     relevance += matches ? matches.length : 0;
//   });

//   return relevance;
// }

// Fetching articles and calculating trending score
// async function getTrendingArticles(keywords) {
//   let articles = await Article.find({ status: true }).lean();

//   // Normalization functions
//   const normalizeViews = (views, maxViews) => views / maxViews;
//   const normalizeRelevance = (relevance, maxRelevance) => relevance / maxRelevance;

//   // Find maximum views and relevance for normalization
//   const maxViews = Math.max(...articles.map(article => article.views));
//   const maxRelevance = Math.max(...articles.map(article => calculateKeywordRelevance(article, keywords)));

//   // Calculate trending score for each article
//   articles = articles.map(article => {
//     const normalizedViews = normalizeViews(article.views, maxViews);
//     const keywordRelevance = calculateKeywordRelevance(article, keywords);
//     const normalizedRelevance = normalizeRelevance(keywordRelevance, maxRelevance);
//     const trendingScore = (0.7 * normalizedViews) + (0.3 * normalizedRelevance); // Example weights

//     return {
//       ...article,
//       trendingScore,
//     };
//   });

//   // Sort articles based on the trending score
//   articles.sort((a, b) => b.trendingScore - a.trendingScore);

//   return articles;
// }






// Function to fetch and sort articles
async function getMostViewedArticles(keywords) {
  // Fetch articles with status true
  let articles = await Article.find({ status: true }).lean();

  // Function to check if an article contains any of the keywords
  function containsKeywords(article, keywords) {
    const text = `${article.title} ${article.description} ${article.body}`.toLowerCase();
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  // Filter articles that contain any of the keywords
  let filteredArticles = articles.filter(article => containsKeywords(article, keywords));

  // Sort filtered articles by views in descending order
  filteredArticles.sort((a, b) => b.views - a.views);

  return filteredArticles;
}

function separateWords(str) {
  // Define a list of stop words
  const stopWords = [
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
    'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
    'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
    'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
    'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
    'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
  ];

  // Remove punctuation and special characters, convert to lowercase
  const cleanedString = str.replace(/[^\w\s]/gi, '').toLowerCase();

  // Split the string into an array of words
  const wordsArray = cleanedString.split(/\s+/);

  // Filter out the stop words
  const filteredWordsArray = wordsArray.filter(word => !stopWords.includes(word));

  return filteredWordsArray;
}


// Home
router.get('/', async (req, res, next) => {
  try {
    let trendings = await getMostViewedArticles(["coding", "coin", "ai"]);

    res.render('user/index', { title: "Earn by Writing Articles | Grovix Lab - Your Online Writing Platform", description: "Join Grovix Lab to earn money by writing articles online. Our platform connects talented writers with businesses seeking quality content. Boost your income by crafting engaging, high-quality articles on diverse topics.", url: 'https://www.grovixlab.com/', trendings, home: true, style: [], user: req.session && req.session.user ? req.session.user : false });
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

// Trending
router.get('/trending', async (req, res, next) => {
  let trend = await getMostViewedArticles(["nodejs", "coin", "ai"]);
  res.render('user/trending', { title: "Trending Articles Insights", description: "Discover top trending articles on Grovix Lab. Stay updated with the latest insights and popular content across various topics.", url: 'https://www.grovixlab.com/trending', ogimage: 'http://www.grovixlab.com/img/opengraph/trending/trending-min.jpg', trend, style: [], user: req.session && req.session.user ? req.session.user : false });
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

// Privacy policy
router.get('/privacy-policy', (req, res, next) => {
  res.render('user/privacy-policy', { title: "Grovix Lab Privacy Policy", description: "Understand our privacy policy and how we collect and manage your information to provide a better experience", url: 'https://www.grovixlab.com/privacy-policy', style: ['article'], user: req.session && req.session.user ? req.session.user : false });
});

// Terms and codintions
router.get('/terms-and-conditions', (req, res, next) => {
  res.render('user/terms-and-conditions', { title: "Grovix Lab Terms and Conditions", description: "Understand our terms and conditions and how we collect and manage your information to provide a better experience", url: 'https://www.grovixlab.com/privacy-policy', style: ['article'], user: req.session && req.session.user ? req.session.user : false });
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
      let keywords = await separateWords(article.title);
      let trend = await getTrendingArticles(keywords);
      let author = await User.findOne({ _id: new mongoose.Types.ObjectId(article.author_id) }).lean();
      res.render('user/article', {
        title: article.title,
        style: ['article'],
        article: article,
        author,
        trend,
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
