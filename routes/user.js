var express = require('express');
const User = require('../models/user');
const Article = require('../models/article');
const Page = require('../models/page');
let mongoose = require('mongoose');

var router = express.Router();

// CSS Minifier
router.get('/user/:user_id', async (req, res, next) => {
    let author = await User.findOne({ _id: new mongoose.Types.ObjectId(req.params.user_id) }).lean();
    res.render('profile/index', { title: `${author.first_name} ${author.last_name} / Grovix Lab`, author, description: author.bio, url: 'https://www.grovixlab.com/user/' + author._id, user: req.session && req.session.user ? req.session.user : false });
});

module.exports = router; 
