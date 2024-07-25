var express = require('express');
const User = require('../models/user');
const Article = require('../models/article');
const Page = require('../models/page');
let mongoose = require('mongoose');

var router = express.Router();

// CSS Minifier
router.get('/author/:user_id', async (req, res, next) => {
    let author = await User.findOne({ _id: new mongoose.Types.ObjectId(req.params.user_id) }).lean();
    res.render('profile/index', { title: `${author.first_name} ${author.last_name} / Grovix Lab`, author, description: author.bio, authorpage: true, url: 'https://www.grovixlab.com/user/' + author._id, user: req.session && req.session.user ? req.session.user : false });
});
 
// Authors Sitemap.xml
router.get('/authors.xml', async (req, res, next) => {
    try {
      const author_list = await User.find({ status: true }).lean();
      console.log(author_list);
      res.type('text/xml');
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset
            xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                  http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  ${author_list.map(author => {
        const lastmod = author.date ? new Date(author.date).toISOString() : new Date().toISOString();
        return `
    <url>
      <loc>https://www.grovixlab.com/author/${author._id}</loc>
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

module.exports = router; 
