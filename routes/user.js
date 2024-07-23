var express = require('express');
const User = require('../models/user');
const Article = require('../models/article');
const Page = require('../models/page');
let mongoose = require('mongoose');

var router = express.Router();

// CSS Minifier
router.get('/user/:user_id', async (req, res, next) => {
    let user = await User.findOne({ _id: new mongoose.Types.ObjectId(req.params.user_id) }).lean();
    res.render('profile/index', { title: "CSS Minifier and Compressor", tool: true, user, style: ["tools"], description: "Use our CSS Minifier & Compressor tool to reduce CSS code size and make your website load faster. Get started for free now", url: 'https://www.grovixlab.com/developer/tools/minify/css', user: req.session && req.session.user ? req.session.user : false });
});

module.exports = router; 
