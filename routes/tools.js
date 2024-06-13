var express = require('express');
const User = require('../models/user');
const Article = require('../models/article');
const Page = require('../models/page');
let mongoose = require('mongoose');
var geoip = require('geoip-lite');

var router = express.Router();

// CSS Minifier
router.get('/developer/tools/minify/css', (req, res, next) => {
    res.render('developer/tools/minify/css/index', { title: "CSS Minifier and Compressor", tool: true, style: ["tools"], description: "Use our CSS Minifier & Compressor tool to reduce CSS code size and make your website load faster. Get started for free now", url: 'https://www.grovixlab.com/developer/tools/minify/css', user: req.session && req.session.user ? req.session.user : false });
});

// JS Minifier
router.get('/developer/tools/minify/js', (req, res, next) => {
    res.render('developer/tools/minify/js/index', { title: "JS Minifier and Compressor", tool: true, style: ["tools"], description: "Use our JS Minifier & Compressor tool to reduce JS code size and make your website load faster. Get started for free now", url: 'https://www.grovixlab.com/developer/tools/minify/js', user: req.session && req.session.user ? req.session.user : false });
});

// HTML Minifier
router.get('/developer/tools/minify/html', (req, res, next) => {
    res.render('developer/tools/minify/html/index', { title: "HTML Minifier and Compressor", tool: true, style: ["tools"], description: "Use our HTML Minifier & Compressor tool to reduce HTML code size and make your website load faster. Get started for free now", url: 'https://www.grovixlab.com/developer/tools/minify/js', user: req.session && req.session.user ? req.session.user : false });
});

// Tools Sitemap.xml
router.get('/sitemap-tools.xml', async (req, res, next) => {
    try {
        res.type('text/xml');
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset
            xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                  http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
      
      
      <url>
  <loc>https://www.grovixlab.com/developer/tools/minify/css</loc>
  <lastmod>2024-06-09T13:39:34+00:00</lastmod>
  <priority>1.00</priority>
</url>
<url>
  <loc>https://www.grovixlab.com/developer/tools/minify/js</loc>
  <lastmod>2024-06-09T13:39:34+00:00</lastmod>
  <priority>0.80</priority>
</url>
<url>
  <loc>https://www.grovixlab.com/developer/tools/minify/html</loc>
  <lastmod>2024-06-09T13:39:34+00:00</lastmod>
  <priority>0.80</priority>
</url>
      
      
      </urlset>`;

        res.send(xmlContent);
    } catch (error) {
        console.error(error);

        res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
    }
});


module.exports = router; 
