var express = require('express');
const User = require('../models/user');
const Article = require('../models/article');
const Page = require('../models/page');
let mongoose = require('mongoose');
var geoip = require('geoip-lite');

var router = express.Router();

router.get('/developer/tools/minify/css', (req, res, next) => {
    res.render('developer/tools/minify/css/index', { title: "CSS Minifier", iserror: true, description: "Enhance your CSS with ease using our CSS Minifier tool. Simply input your CSS code, press 'Minify', and receive a sleek, optimized version immediately. Ideal for web developers and designers looking to enhance website performance.", url: 'https://www.grovixlab.com/developer/tools/minify/css', user: req.session && req.session.user ? req.session.user : false });
});

module.exports = router; 
