var express = require('express');
const User = require('../models/user');
const Article = require('../models/article');
const Page = require('../models/page');
let mongoose = require('mongoose');
var geoip = require('geoip-lite');

var router = express.Router();

// CSS Minifier
router.get('/developer/tools/minify/css', (req, res, next) => {
    res.render('developer/tools/minify/css/index', { title: "CSS Minifier", iserror: true, description: "Enhance your CSS with ease using our CSS Minifier tool. Simply input your CSS code, press 'Minify', and receive a sleek, optimized version immediately. Ideal for web developers and designers looking to enhance website performance.", url: 'https://www.grovixlab.com/developer/tools/minify/css', user: req.session && req.session.user ? req.session.user : false });
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
  <lastmod>2024-06-09T05:16:01+00:00</lastmod>
</url>
      
      
      </urlset>`;

        res.send(xmlContent);
    } catch (error) {
        console.error(error);

        res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
    }
});


module.exports = router; 
