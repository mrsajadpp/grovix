var express = require('express');
const crypash = require('crypash');
var router = express.Router();
const User = require('../models/user');
const Code = require('../models/code');
const Article = require('../models/article');
const ArticleBin = require('../models/artBin');
const userBin = require('../models/userBin');
const Page = require('../models/page');
const Updation = require('../models/updation');
const ArticleDraft = require('../models/articleDraft');
const ArticleEditsBin = require('../models/editBin');
let mail = require('../email/config');
var geoip = require('geoip-lite');
let axios = require('axios');
const cheerio = require('cheerio');
let fs = require('fs');
let path = require('path');
let { sendMail } = require('../email/config')
const speakeasy = require('speakeasy');
// const sharp = require('sharp');
const webp = require('webp-converter');
const { exec } = require('child_process');


const { default: mongoose } = require('mongoose');
const { ObjectId } = require('mongodb');
const { generateKey } = require('crypto');

// Generate a secret key with a length 
// of 20 characters 
const secret = speakeasy.generateSecret({ length: 20 });

// Function to convert timestamp to DD/MM/YYYY format
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0'); // Get day and pad with leading zero if necessary
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month (zero-based) and pad with leading zero if necessary
    const year = date.getFullYear(); // Get full year
    return `${day}-${month}-${year}`;
}

// Function to add one day to a given timestamp and return the new date in DD/MM/YYYY format
function addOneDay(timestamp) {
    const date = new Date(timestamp);
    date.setDate(date.getDate() + 1); // Add one day
    const day = date.getDate().toString().padStart(2, '0'); // Get day and pad with leading zero if necessary
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month (zero-based) and pad with leading zero if necessary
    const year = date.getFullYear(); // Get full year
    return `${day}/${month}/${year}`;
}

const isAdmin = (req, res, next) => {
    if (!req.session.user) {
        res.redirect('/auth/login');
    } else {
        if (!req.session.user.admin) {
            res.redirect('/');
        } else {
            next();
        }
    }
}

function generateOneTimeCode(string1, string2) {
    // Concatenate the two strings
    const combinedString = string1 + string2;

    // Generate a hash of the concatenated string using SHA256 algorithm
    const hash = crypto.createHash('sha256').update(combinedString).digest('hex');

    // Extract the first 6 characters of the hash to create the one-time code
    const oneTimeCode = hash.substring(0, 9);

    return oneTimeCode;
}

function convertToSlug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}



const isAuthorised = (req, res, next) => {
    try {
        if (!req.session.user) {
            res.redirect('/auth/login');
        } else {
            if (req.session.user.status) {
                next();
            } else {
                res.redirect('/auth/login');
            }
        }
    } catch (error) {
        console.error(error);

    }
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
 
// Download the image from the URL
const downloadImage = async (url, filepath) => {
    const writer = fs.createWriteStream(filepath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}; 

// New Article
router.post('/article/request', isAuthorised, async (req, res, next) => {
    try {
        const {
            title,
            description,
            content,
            parentKeyword,
            childKeyword
        } = req.body;

        if (title && description && content) {
            // Generate slug and ensure uniqueness
            let slag = await convertToSlug(title);
            let existSlag = await Article.findOne({ endpoint: slag }).lean();

            await ArticleDraft.deleteOne({ author_id: new mongoose.Types.ObjectId(req.session.user._id) });

            if (existSlag) {
                let counter = 1;
                let newSlag = slag;
                while (await Article.findOne({ endpoint: newSlag }).lean()) {
                    newSlag = `${slag}${counter}`;
                    counter++;
                }
                slag = newSlag;
            }

            // Create article data
            let articleData = {
                title: title,
                description: description,
                category: {
                    parentKeyword,
                    childKeyword
                },
                body: content,
                author_id: req.session.user._id,
                status: true,
                created_time: new Date().toString(),
                endpoint: slag,
                views: 0,
                custom: true,
                new_thumb: true
            };

            // Save article to database
            let article = new Article(articleData);
            await article.save();


            // const imagePath = path.join(__dirname, '/../public/img/article/', `${article._id}.jpg`);

            // Load the HTML into cheerio
            const $ = cheerio.load(articleData.body);

            // Select all image elements and extract the src attributes
            $('img').each((index, element) => {
                const src = $(element).attr('src');
                if (src) {
                    downloadImage(src, path.join(__dirname, '/../public/img/article/', `${articleData.endpoint}-${article._id}-${index}.jpg`));
                    $(element).attr('src', `/img/article/${articleData.endpoint}-${article._id}-${index}.jpg`);
                }
            });

            articleData.body = await $.html();

            await Article.updateOne({ _id: article._id }, articleData);


            // Send confirmation email to the user
            let userData = req.session.user;
            sendMail({
                from: '"Grovix Lab" <noreply.grovix@gmail.com>',
                to: userData.email,
                subject: "Your Article Has Been Requested for Review",
                text: `Hello ${userData.first_name},
        
        We have received your article titled "${article.title}" and it has been requested for review.
        
        Please wait while our team reviews your submission. We will notify you once the review process is complete.
        
        Thank you for your patience and your valuable contribution.
        
        Best regards,
        The Grovix Team`,
                html: `<p>Hello ${userData.first_name},</p>
               <p>We have received your article titled "<strong>${article.title}</strong>" and it has been requested for review.</p>
               <p>Please wait while our team reviews your submission. We will notify you once the review process is complete.</p>
               <p>Thank you for your patience and your valuable contribution.</p>
               <p>Best regards,<br>The Grovix Team</p>`,
            });

            res.redirect('/dashboard/articles/pending');
        } else {
            res.redirect('/dashboard/article/new');
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


// Update article
router.post('/article/update/:article_id', isAuthorised, async (req, res, next) => {
    try {
        const { title, description, content, parentKeyword, childKeyword } = req.body;
        const { user } = req.session;
        const articleId = req.params.article_id;
        const article = await Article.findOne({ _id: new ObjectId(articleId), author_id: user._id }).lean();

        if (title && description && content) {
            if (article) {
                const updateData = {
                    article_id: article._id,
                    author_id: user._id,
                    title,
                    description,
                    category: {
                        parentKeyword,
                        childKeyword
                    },
                    body: content,
                    endpoint: article.endpoint,
                    views: article.views,
                    created_time: article.created_time,
                    updated_at: new Date().toString(),
                    status: true, // Set status based on article's current status
                    custom: true,
                    new_thumb: true
                };

                // Check if an updation already exists for this article with status 'pending'
                const existingUpdation = await Updation.findOne({ article_id: article._id.toString(), status: 'pending' });

                // Load the HTML into cheerio
                const $ = cheerio.load(updateData.body);

                // Select all image elements and extract the src attributes
                $('img').each((index, element) => {
                    const src = $(element).attr('src');
                    if (src) {
                        const imagePath = path.join(__dirname, '/../public/img/update/', `${article.endpoint}-${article._id}-${index}.jpg`);
                        src.startsWith('/img/')
                            ? downloadImage(`http://localhost:${process.env.PORT}${src}`, imagePath)
                            : downloadImage(src, imagePath);
                        $(element).attr('src', `/img/update/${article.endpoint}-${article._id}-${index}.jpg`);
                    }
                });

                updateData.body = $.html();

                // if (existingUpdation) {
                //     // Update existing updation record
                //     await Updation.updateOne({ _id: existingUpdation._id }, updateData);
                // } else if (article.status == 'false') {
                //     // Update the article directly if its status is false
                //     updateData.status = await false;
                //     await Article.updateOne({ _id: article._id }, updateData);
                // } else {
                //     // Create a new updation record
                //     const updation = new Updation(updateData);
                //     await updation.save();
                // }

                await Article.updateOne({ _id: article._id }, updateData);

                // Send email notification to the author
                sendMail({
                    from: '"Grovix Lab" <noreply.grovix@gmail.com>',
                    to: user.email,
                    subject: "Your Article Edits Have Been Requested for Review",
                    text: `Hello ${user.first_name},

Your article titled "${article.title}" has been updated and requested for review. Until the review is complete, the current version of your article remains published.

If you have any questions, please contact our support team for assistance.

Thank you for your understanding.

Best regards,
The Grovix Team`,
                    html: `<p>Hello ${user.first_name},</p>
<p>Your article titled "<strong>${article.title}</strong>" has been updated and requested for review. Until the review is complete, the current version of your article remains published.</p>
<p>If you have any questions, please contact our support team for assistance.</p>
<p>Thank you for your understanding.</p>
<p>Best regards,<br>The Grovix Team</p>`,
                });

                res.redirect('/dashboard/articles');
            } else {
                res.render('error', { title: "404", status: 404, message: "Article not found", style: ['error'], user });
            }
        } else {
            res.render('dashboard/editArticle', { title: "Edit Article", style: ['dashboard', 'newArticle'], article, error: { message: "Please fill in all fields" }, user });
        }
    } catch (error) {
        console.error(error);
        res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
    }
});

// Approve article update
router.get('/article/approve/:updation_id', isAdmin, async (req, res, next) => {
    try {
        const updationId = req.params.updation_id;
        const updation = await Updation.findById(updationId).lean();

        if (updation) {
            const { article_id, title, description, category, body } = updation;

            let article = await Article.findOne({ _id: new ObjectId(article_id) }).lean();

            // Load the HTML into cheerio
            const $ = cheerio.load(body);

            // Select all image elements and extract the src attributes
            $('img').each((index, element) => {
                const src = $(element).attr('src');
                if (src) {
                    src.startsWith('/img/') ? downloadImage(`http://localhost:${process.env.PORT}${src}`, path.join(__dirname, '/../public/img/article/', `${article.endpoint}-${article._id}-${index}.jpg`)) : downloadImage(src, path.join(__dirname, '/../public/img/article/', `${article.endpoint}-${article._id}-${index}.jpg`));
                    $(element).attr('src', `/img/article/${article.endpoint}-${article._id}-${index}.jpg`);
                }
            });

            let articleBody = await $.html();

            await Article.updateOne({ _id: article_id }, { title, description, category, body: articleBody, updated_at: new Date().toString(), custom: true });
            await Updation.deleteOne({ _id: updationId });

            // Notify the author
            const user = await User.findById(updation.author_id).lean();
            sendMail({
                from: '"Grovix Lab" <noreply.grovix@gmail.com>',
                to: user.email,
                subject: "Your Article Edits Have Been Approved",
                text: `Hello ${user.first_name},
  
  Your edits for the article titled "${title}" have been approved and published.
  
  Thank you for your contribution.
  
  Best regards,
  The Grovix Team`,
                html: `<p>Hello ${user.first_name},</p>
                 <p>Your edits for the article titled "<strong>${title}</strong>" have been approved and published.</p>
                 <p>Thank you for your contribution.</p>
                 <p>Best regards,<br>The Grovix Team</p>`,
            });

            res.redirect('/admin/articles');
        } else {
            res.render('error', { title: "404", status: 404, message: "Updation not found", style: ['error'], user: req.session.user ? req.session.user : false });
        }
    } catch (error) {
        console.error(error);
        res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
    }
});

module.exports = router;