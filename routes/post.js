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
let fs = require('fs');
let path = require('path');
const CleanCSS = require('clean-css');
const { minify } = require('uglify-js');
const minifyHTML = require('html-minifier');
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


// Determine the correct path to cwebp based on the OS
const cwebpPath = process.platform === 'win32'
  ? path.resolve(__dirname, '../node_modules/webp-converter/bin/libwebp_win64/bin/cwebp.exe')
  : path.resolve(__dirname, '../node_modules/webp-converter/bin/cwebp');

const convertToWebp = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    exec(`cwebp -q 80 "${inputPath}" -o "${outputPath}"`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
};

// Edit Profile
router.post('/profile/edit', isAuthorised, async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      sex,
      bio,
      address_line_one,
      address_line_two,
      country,
      state,
      city,
      zip_code
    } = req.body;

    if (first_name || last_name || phone || sex || bio || address_line_one || address_line_two || country || state || city || zip_code) {
      let user = await User.findOne({ _id: new mongoose.Types.ObjectId(req.session.user._id) }).lean();

      let userData = {
        first_name: first_name ? first_name : user.first_name,
        last_name: last_name ? last_name : user.last_name,
        contact_no: phone ? phone : user.contact_no,
        sex: sex ? sex : user.sex,
        bio: bio ? bio : user.bio,
        address: {
          address_line_one: address_line_one ? address_line_one : user.address.address_line_one,
          addressline_two: address_line_two ? address_line_two : user.address.addressline_two,
          country: country ? country : user.address.country,
          state: state ? state : user.address.state,
          city: city ? city : user.address.city,
          zip_code: zip_code ? zip_code : user.address.zip_code
        }
      };

      await User.updateOne({ _id: new mongoose.Types.ObjectId(req.session.user._id) }, userData);
      let userUp = await User.findOne({ _id: new mongoose.Types.ObjectId(req.session.user._id) }).lean();
      req.session.user = userUp;

      if (req.files && req.files.profile) {
        let profileFile = req.files.profile;
        let imagePath = path.join(__dirname, '/../public/img/user/', user._id + '.jpg');
        let webpPath = path.join(__dirname, '/../public/img/user/', user._id + '.webp');

        profileFile.mv(imagePath, async function (err) {
          if (err) {
            return res.render('dashboard/settings', { title: "Settings >> Dashboard", style: ['dashboard', 'settings', 'regform'], user: req.session && req.session.user ? req.session.user : false, error: { message: "Error uploading profile image: " + err } });
          }

          // Convert JPG to WebP
          try {
            await convertToWebp(imagePath, webpPath);
            console.log(`Converted ${imagePath} to ${webpPath}`);
            res.redirect('/dashboard/settings');
          } catch (error) {
            console.error('Error converting image:', error);
            res.render('dashboard/settings', { title: "Settings >> Dashboard", style: ['dashboard', 'settings', 'regform'], user: req.session && req.session.user ? req.session.user : false, error: { message: "Error converting profile image: " + error.message } });
          }
        });
      } else {
        res.redirect('/dashboard/settings');
      }
    } else {
      res.render('dashboard/settings', { title: "Settings >> Dashboard", style: ['dashboard', 'settings', 'regform'], user: req.session && req.session.user ? req.session.user : false, error: { message: "Please fill blank input box." } });
    }
  } catch (error) {
    console.error(error);

    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// New article
// router.post('/article/request', isAuthorised, async (req, res, next) => {
//   try {
//     const {
//       title,
//       description,
//       content
//     } = req.body;

//     if (title && description && content) {
//       // Generate slug and ensure uniqueness
//       let slag = await convertToSlug(title);
//       let existSlag = await Article.findOne({ endpoint: slag }).lean();

//       await ArticleDraft.deleteOne({ author_id: new mongoose.Types.ObjectId(req.session.user._id) });

//       if (existSlag) {
//         let counter = 1;
//         let newSlag = slag;
//         while (await Article.findOne({ endpoint: newSlag }).lean()) {
//           newSlag = `${slag}${counter}`;
//           counter++;
//         }
//         slag = newSlag;
//       }

//       // Create article data
//       let articleData = {
//         title: title,
//         description: description,
//         category: 'null',
//         body: content,
//         author_id: req.session.user._id,
//         status: false,
//         created_time: new Date().toString(),
//         endpoint: slag,
//         views: 0,
//         custom: true,
//       };

//       // Save article to database
//       let article = new Article(articleData);
//       await article.save();

//       // Extract first image from content and save it
//       const imgTagRegex = /<img[^>]+src="([^">]+)"/i;
//       const match = imgTagRegex.exec(content);

//       if (match && match[1]) {
//         const imgURL = match[1];
//         const imagePath = path.join(__dirname, '/../public/img/article/', `${article._id}.jpg`);

//         // Download the image from the URL
//         const downloadImage = async (url, filepath) => {
//           const writer = fs.createWriteStream(filepath);
//           const response = await axios({
//             url,
//             method: 'GET',
//             responseType: 'stream'
//           });

//           response.data.pipe(writer);

//           return new Promise((resolve, reject) => {
//             writer.on('finish', resolve);
//             writer.on('error', reject);
//           });
//         };

//         try {
//           await downloadImage(imgURL, imagePath);
//         } catch (err) {
//           console.error("Error downloading image:", err);
//         }
//       }

//       // Send confirmation email to the user
//       let userData = req.session.user;
//       sendMail({
//         from: '"Grovix Lab" <noreply.grovix@gmail.com>',
//         to: userData.email,
//         subject: "Your Article Has Been Requested for Review",
//         text: `Hello ${userData.first_name},

//         We have received your article titled "${article.title}" and it has been requested for review.

//         Please wait while our team reviews your submission. We will notify you once the review process is complete.

//         Thank you for your patience and your valuable contribution.

//         Best regards,
//         The Grovix Team`,
//         html: `<p>Hello ${userData.first_name},</p>
//                <p>We have received your article titled "<strong>${article.title}</strong>" and it has been requested for review.</p>
//                <p>Please wait while our team reviews your submission. We will notify you once the review process is complete.</p>
//                <p>Thank you for your patience and your valuable contribution.</p>
//                <p>Best regards,<br>The Grovix Team</p>`,
//       });

//       res.redirect('/dashboard/articles/pending');
//     }
//   } catch (error) {
//     console.error(error);
//     res.render('error', {
//       title: "500",
//       status: 500,
//       message: error.message,
//       style: ['error'],
//       user: req.session && req.session.user ? req.session.user : false
//     });
//   }
// });

// Autosave endpoint
router.post('/article/autosave', isAuthorised, async (req, res) => {
  try {
    const { title, description, content } = req.body;
    const userId = req.session.user._id;

    // Save the draft data
    await ArticleDraft.updateOne(
      { author_id: userId },
      { title, description, content, last_saved: new Date() },
      { upsert: true }
    );

    res.json({ success: true, message: 'Draft autosaved successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Autosave failed.' });
  }
});


// Delete article
router.get('/article/delete/:article_id', isAuthorised, async (req, res, next) => {
  try {
    const articleId = req.params.article_id;
    const userId = req.session.user._id;

    if (articleId) {
      // Find the article by ID and author ID
      let article = await Article.findOneAndDelete({ _id: new mongoose.Types.ObjectId(articleId), author_id: userId });

      if (article) {
        // Move the article to the ArticleBin
        const deletedArticle = new ArticleBin(article.toObject());
        await deletedArticle.save();

        // User data for email
        const userData = req.session.user;

        // Send email notification
        sendMail({
          from: '"Grovix Lab" <noreply.grovix@gmail.com>',
          to: userData.email,
          subject: "Your Article Has Been Deleted",
          text: `Hello ${userData.firstName},

This is to inform you that your article titled "${article.title}" has been successfully deleted by yourself.

If this was a mistake or you have any questions, please contact our support team for assistance.

Thank you for your understanding.

Best regards,
The Grovix Team`,

          html: `<p>Hello ${userData.firstName},</p>
                 <p>This is to inform you that your article titled "<strong>${article.title}</strong>" has been successfully deleted by yourself.</p>
                 <p>If this was a mistake or you have any questions, please contact our support team for assistance.</p>
                 <p>Thank you for your understanding.</p>
                 <p>Best regards,<br>The Grovix Team</p>`,
        });

        res.redirect('/dashboard/articles');
      } else {
        // If the article was not found or not deleted, redirect with an error
        res.redirect('/dashboard/articles?error=Article not found or not authorized to delete');
      }
    } else {
      res.redirect('/dashboard/articles?error=Invalid article ID');
    }
  } catch (error) {
    console.error(error);

    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Admin delete article
router.get('/article/admin/delete/:article_id/:delete_reason', isAuthorised, async (req, res, next) => {
  try {
    const articleId = req.params.article_id;
    const adminUserId = req.session.user._id;
    const deleteReson = req.params.delete_reason;

    if (articleId && deleteReson) {
      // Check if the user is an admin
      const user = await User.findOne({ _id: new mongoose.Types.ObjectId(adminUserId) }).lean();
      if (user && user.admin) {
        // Find the article
        const article = await Article.findOneAndDelete({ _id: new mongoose.Types.ObjectId(articleId) });

        if (article) {
          // Move the article to the ArticleBin
          let delArticle = {
            article_id: article._id,
            author_id: article.author_id,
            title: article.title,
            description: article.description,
            category: article.category,
            status: article.status,
            body: article.body,
            created_time: article.created_time,
            views: article.views,
            endpoint: article.endpoint,
            updated_at: article.updated_at
          };
          const deletedArticle = new ArticleBin(delArticle);
          await deletedArticle.save();

          // Find the article's author to send the notification email
          const author = await User.findOne({ _id: new mongoose.Types.ObjectId(article.author_id) }).lean();

          if (author) {
            // Send email notification to the article's author
            sendMail({
              from: '"Grovix Lab" <noreply.grovix@gmail.com>',
              to: author.email,
              subject: "Your Article Has Been Deleted by Admin",
              text: `Hello ${author.first_name},

This is to inform you that your article titled "${article.title}" has been deleted by an admin, Reson: ${deleteReson}.

If you have any questions, please contact our support team for assistance.

Thank you for your understanding.

Best regards,
The Grovix Team`,

              html: `<p>Hello ${author.first_name},</p>
                     <p>This is to inform you that your article titled "<strong>${article.title}</strong>" has been deleted by an admin,  <span style="colour: red;">Reson: ${deleteReson}</span>.</p>
                     <p>If you have any questions, please contact our support team for assistance.</p>
                     <p>Thank you for your understanding.</p>
                     <p>Best regards,<br>The Grovix Team</p>`,
            });
          }

          res.redirect('/admin/articles');
        } else {
          res.redirect('/admin/articles?error=Article not found');
        }
      } else {
        res.redirect('/admin/articles?error=Unauthorized');
      }
    } else {
      res.redirect('/admin/articles?error=Invalid article ID');
    }
  } catch (error) {
    console.error(error);

    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Approve
router.get('/article/admin/approve/:article_id', isAuthorised, async (req, res, next) => {
  try {
    if (req.params.article_id) {
      let user = await User.findOne({ _id: new mongoose.Types.ObjectId(req.session.user._id) }).lean();
      let article = await Article.findOne({ _id: new mongoose.Types.ObjectId(req.params.article_id) }).lean();
      if (user.admin) {
        await Article.updateOne({ _id: new mongoose.Types.ObjectId(req.params.article_id) }, { status: true });

        let userData = await User.findOne({ _id: new mongoose.Types.ObjectId(article.author_id) }).lean();

        sendMail({
          from: '"Grovix Lab" <noreply.grovix@gmail.com>',
          to: userData.email,
          subject: "Your Article Has Been Approved",
          text: `Hello ${userData.first_name},
        
        We are pleased to inform you that your article titled "${article.title}" has been successfully approved by ${user.first_name} ${user.last_name}.
        
        You can now view your published article at the following link:
        https://www.grovixlab.com/page/${article.endpoint}
        
        Thank you for your valuable contribution. We look forward to more insightful articles from you.
        
        Best regards,
        The Grovix Team`,

          html: `<p>Hello ${userData.first_name},</p>
                 <p>We are pleased to inform you that your article titled "<strong>${article.title}</strong>" has been successfully approved by <strong>${user.first_name} ${user.last_name}</strong>.</p>
                 <p>You can now view your published article at the following link:<br>
                 <a href="https://www.grovixlab.com/page/${article.endpoint}">https://www.grovixlab.com/page/${article.endpoint}</a></p>
                 <p>Thank you for your valuable contribution. We look forward to more insightful articles from you.</p>
                 <p>Best regards,<br>The Grovix Team</p>`,
        });

      }
      res.redirect('/admin/articles');
    }
  } catch (error) {
    console.error(error);

    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Lock article
router.get('/article/admin/block/:article_id/:lock_reason', isAuthorised, async (req, res, next) => {
  try {
    const articleId = req.params.article_id;
    const adminUserId = req.session.user._id;
    const lockReason = req.params.lock_reason;

    if (articleId && lockReason) {
      // Check if the user is an admin
      const user = await User.findOne({ _id: new mongoose.Types.ObjectId(adminUserId) });
      if (user && user.admin) {
        // Lock the article by updating its status
        const article = await Article.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(articleId) },
          { status: 'locked' },
          { new: true }
        );

        if (article) {
          // Find the article's author to send the notification email
          const author = await User.findOne({ _id: new mongoose.Types.ObjectId(article.author_id) }).lean();

          if (author) {
            // Send email notification to the article's author
            sendMail({
              from: '"Grovix Lab" <noreply.grovix@gmail.com>',
              to: author.email,
              subject: "Your Article Has Been Bin",
              text: `Hello ${author.first_name},

This is to inform you that your article titled "${article.title}" has been locked by an admin, Reson: ${lockReason}.

If you have any questions or believe this to be a mistake, please contact our support team for assistance.

Thank you for your understanding.

Best regards,
The Grovix Team`,

              html: `<p>Hello ${author.first_name},</p>
                     <p>This is to inform you that your article titled "<strong>${article.title}</strong>" has been locked by an admin,  <span style="colour: red;">Reson: ${lockReason}</span>.</p>
                     <p>If you have any questions or believe this to be a mistake, please contact our support team for assistance.</p>
                     <p>Thank you for your understanding.</p>
                     <p>Best regards,<br>The Grovix Team</p>`,
            });
          }

          res.redirect('/admin/articles');
        } else {
          res.redirect('/admin/articles?error=Article not found');
        }
      } else {
        res.redirect('/admin/articles?error=Unauthorized');
      }
    } else {
      res.redirect('/admin/articles?error=Invalid article ID');
    }
  } catch (error) {
    console.error(error);

    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Unlock article
router.get('/article/admin/unblock/:article_id', isAuthorised, async (req, res, next) => {
  try {
    const articleId = req.params.article_id;
    const adminUserId = req.session.user._id;

    if (articleId) {
      // Check if the user is an admin
      const user = await User.findOne({ _id: new mongoose.Types.ObjectId(adminUserId) });
      if (user && user.admin) {
        // Unlock the article by updating its status
        const article = await Article.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(articleId) },
          { status: true }, // Assuming 'unlocked' is the status you want to set
          { new: true }
        );

        if (article) {
          // Find the article's author to send the notification email
          const author = await User.findOne({ _id: new mongoose.Types.ObjectId(article.author_id) }).lean();

          if (author) {
            // Send email notification to the article's author
            sendMail({
              from: '"Grovix Lab" <noreply.grovix@gmail.com>',
              to: author.email,
              subject: "Your Article Has Been Unlocked",
              text: `Hello ${author.first_name},

This is to inform you that your article titled "${article.title}" has been unlocked by an admin.

If you have any questions, please contact our support team for assistance.

Thank you.

Best regards,
The Grovix Team`,

              html: `<p>Hello ${author.first_name},</p>
                     <p>This is to inform you that your article titled "<strong>${article.title}</strong>" has been unlocked by an admin.</p>
                     <p>If you have any questions, please contact our support team for assistance.</p>
                     <p>Thank you.</p>
                     <p>Best regards,<br>The Grovix Team</p>`,
            });
          }

          res.redirect('/admin/articles');
        } else {
          res.redirect('/admin/articles?error=Article not found');
        }
      } else {
        res.redirect('/admin/articles?error=Unauthorized');
      }
    } else {
      res.redirect('/admin/articles?error=Invalid article ID');
    }
  } catch (error) {
    console.error(error);

    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});


// Update article
// router.post('/article/update/:article_id', isAuthorised, async (req, res, next) => {
//   try {
//     const { title, description, content } = req.body;
//     const { user } = req.session;
//     const articleId = req.params.article_id;
//     const article = await Article.findOne({ _id: new mongoose.Types.ObjectId(articleId), author_id: user._id }).lean();

//     if (title && description && content) {

//       if (article) {
//         const updateData = {
//           article_id: article._id,
//           author_id: user._id,
//           title,
//           description,
//           category: 'null',
//           body: content,
//           created_time: article.created_time,
//           updated_at: new Date().toString(),
//           status: 'pending',
//           custom: true,
//         };

//         // Check if an updation already exists for this article
//         const existingUpdation = await Updation.findOne({ article_id: article._id, status: 'pending' });

//         // Extract first image from content and save it
//         const imgTagRegex = /<img[^>]+src="([^">]+)"/i;
//         const match = imgTagRegex.exec(content);

//         if (match && match[1]) {
//           const imgURL = match[1];
//           const imagePath = path.join(__dirname, '/../public/img/article/', `${article._id}.jpg`);

//           // Download the image from the URL
//           const downloadImage = async (url, filepath) => {
//             const writer = fs.createWriteStream(filepath);
//             const response = await axios({
//               url,
//               method: 'GET',
//               responseType: 'stream'
//             });

//             response.data.pipe(writer);

//             return new Promise((resolve, reject) => {
//               writer.on('finish', resolve);
//               writer.on('error', reject);
//             });
//           };

//           try {
//             await downloadImage(imgURL, imagePath);
//           } catch (err) {
//             console.error("Error downloading image:", err);
//           }
//         }

//         if (existingUpdation) {
//           // Update existing updation record
//           await Updation.updateOne({ _id: existingUpdation._id }, updateData);
//         } else {
//           // Create a new updation record
//           const updation = new Updation(updateData);
//           await updation.save();
//         }

//         if (req.files && req.files.thumbnail) {
//           const thumbnailFile = req.files.thumbnail;
//           const imagePath = __dirname + '/../public/img/article/' + article._id + '.jpg';

//           thumbnailFile.mv(imagePath, async (err) => {
//             if (err) {
//               return res.render('dashboard/editArticle', { title: "Edit Article", style: ['dashboard', 'newArticle'], article, error: { message: "Error uploading thumbnail image: " + err }, user });
//             }
//           });
//         }

//         // Send email notification to the author
//         sendMail({
//           from: '"Grovix Lab" <noreply.grovix@gmail.com>',
//           to: user.email,
//           subject: "Your Article Edits Have Been Requested for Review",
//           text: `Hello ${user.first_name},

// Your article titled "${article.title}" has been updated and requested for review. Until the review is complete, the current version of your article remains published.

// If you have any questions, please contact our support team for assistance.

// Thank you for your understanding.

// Best regards,
// The Grovix Team`,
//           html: `<p>Hello ${user.first_name},</p>
//                  <p>Your article titled "<strong>${article.title}</strong>" has been updated and requested for review. Until the review is complete, the current version of your article remains published.</p>
//                  <p>If you have any questions, please contact our support team for assistance.</p>
//                  <p>Thank you for your understanding.</p>
//                  <p>Best regards,<br>The Grovix Team</p>`,
//         });

//         res.redirect('/dashboard/articles');
//       } else {
//         res.render('error', { title: "404", status: 404, message: "Article not found", style: ['error'], user });
//       }
//     } else {
//       res.render('dashboard/editArticle', { title: "Edit Article", style: ['dashboard', 'newArticle'], article, error: { message: "Please fill in all fields" }, user });
//     }
//   } catch (error) {
//     console.error(error);
//     res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
//   }
// });


// Approve article update
// router.get('/article/approve/:updation_id', isAdmin, async (req, res, next) => {
//   try {
//     const updationId = req.params.updation_id;
//     const updation = await Updation.findById(updationId).lean();

//     if (updation) {
//       const { article_id, title, description, category, body } = updation;

//       await Article.updateOne({ _id: article_id }, { title, description, category, body, updated_at: new Date().toString(), custom: true });
//       await Updation.deleteOne({ _id: updationId });

//       // Notify the author
//       const user = await User.findById(updation.author_id).lean();
//       sendMail({
//         from: '"Grovix Lab" <noreply.grovix@gmail.com>',
//         to: user.email,
//         subject: "Your Article Edits Have Been Approved",
//         text: `Hello ${user.first_name},

// Your edits for the article titled "${title}" have been approved and published.

// Thank you for your contribution.

// Best regards,
// The Grovix Team`,
//         html: `<p>Hello ${user.first_name},</p>
//                <p>Your edits for the article titled "<strong>${title}</strong>" have been approved and published.</p>
//                <p>Thank you for your contribution.</p>
//                <p>Best regards,<br>The Grovix Team</p>`,
//       });

//       res.redirect('/admin/articles');
//     } else {
//       res.render('error', { title: "404", status: 404, message: "Updation not found", style: ['error'], user: req.session.user ? req.session.user : false });
//     }
//   } catch (error) {
//     console.error(error);
//     res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
//   }
// });

// Cancel article update
router.get('/article/cancel/:updation_id', isAdmin, async (req, res, next) => {
  try {
    const updationId = req.params.updation_id;
    const updation = await Updation.findById(updationId).lean();

    if (updation) {
      const { article_id, author_id, title, description, category, body, created_time, updated_at } = updation;

      // Move to ArticleEditsBin
      const articleEditsBinData = {
        article_id,
        author_id,
        title,
        description,
        category,
        body,
        created_time,
        updated_at: new Date(),
        status: 'canceled',
      };

      const articleEditsBin = new ArticleEditsBin(articleEditsBinData);
      await articleEditsBin.save();
      await Updation.deleteOne({ _id: updationId });

      // Notify the author
      const user = await User.findById(author_id).lean();
      sendMail({
        from: '"Grovix Lab" <noreply.grovix@gmail.com>',
        to: user.email,
        subject: "Your Article Edits Have Been Canceled",
        text: `Hello ${user.first_name},

Your edits for the article titled "${title}" have been canceled by the admin. The current version of your article remains published.

If you have any questions, please contact our support team for assistance.

Best regards,
The Grovix Team`,
        html: `<p>Hello ${user.first_name},</p>
               <p>Your edits for the article titled "<strong>${title}</strong>" have been canceled by the admin. The current version of your article remains published.</p>
               <p>If you have any questions, please contact our support team for assistance.</p>
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


// Block or Unblock User
router.post('/admin/users/block/:user_id', isAdmin, async (req, res, next) => {
  try {
    const userId = req.params.user_id;
    const { block_reason } = req.body;

    // Find the user by ID
    const user = await User.findById(userId);
    if (user) {
      // Toggle the user's status
      user.status = !user.status;
      await user.save();

      // Send email notification to the user
      sendMail({
        from: '"Grovix Lab" <noreply.grovix@gmail.com>',
        to: user.email,
        subject: user.status ? "Your Account Has Been Unblocked" : "Your Account Has Been Blocked",
        text: `Hello ${user.first_name},

This is to inform you that your account has been ${user.status ? "unblocked" : "blocked"} by an admin. Reason: ${block_reason}

If you have any questions or believe this to be a mistake, please contact our support team for assistance.

Thank you for your understanding.

Best regards,
The Grovix Team`,

        html: `<p>Hello ${user.first_name},</p>
               <p>This is to inform you that your account has been <strong>${user.status ? "unblocked" : "blocked"}</strong> by an admin. Reason: ${block_reason}</p>
               <p>If you have any questions or believe this to be a mistake, please contact our support team for assistance.</p>
               <p>Thank you for your understanding.</p>
               <p>Best regards,<br>The Grovix Team</p>`,
      });

      res.redirect('/admin/users');
    } else {
      res.redirect('/admin/users?error=User not found');
    }
  } catch (error) {
    console.error(error);

    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});


// Ban User
router.post('/admin/users/ban/:user_id', isAdmin, async (req, res, next) => {
  try {
    const userId = req.params.user_id;
    const { ban_reason } = req.body;

    // Find the user by ID
    const user = await User.findById(userId);
    if (user) {
      // Move the user to the userBin
      const bannedUser = new userBin(user.toObject());
      await bannedUser.save();
      await User.findByIdAndDelete(userId);

      // Send email notification to the user
      sendMail({
        from: '"Grovix Lab" <noreply.grovix@gmail.com>',
        to: user.email,
        subject: "Your Account Has Been Banned",
        text: `Hello ${user.first_name},

This is to inform you that your account has been banned by an admin. Reason: ${ban_reason}

If you have any questions or believe this to be a mistake, please contact our support team for assistance.

Thank you for your understanding.

Best regards,
The Grovix Team`,

        html: `<p>Hello ${user.first_name},</p>
               <p>This is to inform you that your account has been <strong>banned</strong> by an admin. Reason: ${ban_reason}</p>
               <p>If you have any questions or believe this to be a mistake, please contact our support team for assistance.</p>
               <p>Thank you for your understanding.</p>
               <p>Best regards,<br>The Grovix Team</p>`,
      });

      res.redirect('/admin/users');
    } else {
      res.redirect('/admin/users?error=User not found');
    }
  } catch (error) {
    console.error(error);

    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});


// Promote or Demote User to Admin
router.post('/admin/users/admin/:user_id', isAdmin, async (req, res, next) => {
  try {
    const userId = req.params.user_id;

    // Find the user by ID
    const user = await User.findById(userId);
    if (user) {
      // Toggle the user's admin status
      user.admin = !user.admin;
      await user.save();

      // Send email notification to the user
      sendMail({
        from: '"Grovix Lab" <noreply.grovix@gmail.com>',
        to: user.email,
        subject: user.admin ? "You Have Been Promoted to Admin" : "You Have Been Demoted from Admin",
        text: `Hello ${user.first_name},

This is to inform you that your account has been ${user.admin ? "promoted to" : "demoted from"} admin status by an admin.

If you have any questions or believe this to be a mistake, please contact our support team for assistance.

Thank you for your understanding.

Best regards,
The Grovix Team`,

        html: `<p>Hello ${user.first_name},</p>
               <p>This is to inform you that your account has been <strong>${user.admin ? "promoted to" : "demoted from"}</strong> admin status by an admin.</p>
               <p>If you have any questions or believe this to be a mistake, please contact our support team for assistance.</p>
               <p>Thank you for your understanding.</p>
               <p>Best regards,<br>The Grovix Team</p>`,
      });

      res.redirect('/admin/users');
    } else {
      res.redirect('/admin/users?error=User not found');
    }
  } catch (error) {
    console.error(error);

    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});


// Password Reset
router.post('/auth/recover/create', async (req, res, next) => {
  try {
    const userEmail = req.body.email;

    // Find the user by email
    const user = await User.findOne({ email: userEmail }).lean();
    if (user) {
      const page = await new Page({ user_id: user._id, created_time: new Date(), status: true });
      await page.save();

      console.log(page);

      const pageUrl = `https://www.grovixlab.com/reset/${page._id}`;

      // Send email notification to the user
      sendMail({
        from: '"Grovix Lab" <noreply.grovix@gmail.com>',
        to: user.email,
        subject: "Password Reset Request",
        text: `Hello ${user.first_name},

We have received a request to reset your password. You can reset your password by clicking the link below:

${pageUrl}

If you did not request a password reset, please ignore this email or contact our support team.

Thank you.

Best regards,
The Grovix Team`,

        html: `<p>Hello ${user.first_name},</p>
               <p>We have received a request to reset your password. You can reset your password by clicking the link below:</p>
               <p><a href="${pageUrl}">${pageUrl}</a></p>
               <p>If you did not request a password reset, please ignore this email or contact our support team.</p>
               <p>Thank you.</p>
               <p>Best regards,<br>The Grovix Team</p>`,
      });

      res.redirect('/auth/login');
    } else {
      res.redirect('/auth/recover?error=User not found');
    }
  } catch (error) {
    console.error(error);
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


// Password Update
router.post('/auth/pass/new', async (req, res, next) => {
  try {
    const { password, email } = req.body;

    // Hash the new password
    const hashedPassword = await crypash.hash('sha256', password);

    // Find the user by email
    const user = await User.findOne({ email }).lean();
    if (user) {
      // Update the user's password
      let upUser = await User.findById(user._id);
      upUser.password = hashedPassword;
      await upUser.save();

      // Send email notification to the user
      sendMail({
        from: '"Grovix Lab" <noreply.grovix@gmail.com>',
        to: user.email,
        subject: "Your Password Has Been Reset",
        text: `Hello ${user.first_name},

This is to confirm that your password has been successfully reset. If you did not request this change, please contact our support team immediately.

Thank you.

Best regards,
The Grovix Team`,

        html: `<p>Hello ${user.first_name},</p>
               <p>This is to confirm that your password has been successfully reset. If you did not request this change, please contact our support team immediately.</p>
               <p>Thank you.</p>
               <p>Best regards,<br>The Grovix Team</p>`,
      });

      res.redirect('/auth/login');
    } else {
      res.redirect('/auth/recover?error=User not found');
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

// Admin alert
router.post('/admin/send', isAdmin, async (req, res, next) => {
  try {

    if (req.body.subject && req.body.body) {
      let users = await User.find().lean();
      users.forEach(user => {
        // Send email notification to the user
        sendMail({
          from: '"Grovix Lab" <noreply.grovix@gmail.com>',
          to: user.email,
          subject: req.body.subject,
          text: req.body.body,

          html: req.body.body,
        });
      });
      res.redirect('/admin/alert');
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

// Fetch analytics data for charts
router.get('/articles/analytics', isAuthorised, async (req, res) => {
  try {
    const articles = await Article.find({ author_id: req.session.user._id }).sort({ views: -1 }).lean();

    // Most viewed article
    const mostViewedArticle = articles[0];

    // Most impressions article
    const mostImpressionsArticle = articles.sort((a, b) => b.impressions - a.impressions)[0];

    // Country views
    const countryViews = {};
    articles.forEach(article => {
      for (const [country, views] of Object.entries(article.country_views || {})) {
        countryViews[country] = (countryViews[country] || 0) + views;
      }
    });
    const mostVisitingCountry = Object.keys(countryViews).reduce((a, b) => countryViews[a] > countryViews[b] ? a : b);

    // Prepare data for charts
    const articleViewsData = articles.map(article => ({
      title: article.title,
      views: article.views,
      impressions: article.impressions,
      created_time: article.created_time
    }));

    res.json({
      success: true,
      data: {
        articleViewsData,
        mostViewedArticle,
        mostImpressionsArticle,
        countryViews,
        mostVisitingCountry
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch article data' });
  }
});

// Search suggestions
router.get('/api/suggestions', async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const suggestions = await Article.find({
      $or: [
        { title: new RegExp(query, 'i') },
        { description: new RegExp(query, 'i') }
      ]
    }, 'title description endpoint')
      .limit(10);

    console.log(suggestions);

    res.json(suggestions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Minify css
router.post('/api/minify/css', (req, res) => {
  const inputCSS = req.body.css;

  if (!inputCSS) {
    return res.status(400).send({ error: 'No CSS provided' });
  }

  const output = new CleanCSS().minify(inputCSS);

  if (output.errors.length > 0) {
    return res.status(500).send({ error: output.errors });
  }

  res.send({ minifiedCSS: output.styles });
});

// Minify JavaScript
router.post('/api/minify/js', (req, res) => {
  const inputJS = req.body.js;
  console.log(inputJS);

  if (!inputJS) {
    return res.status(400).send({ error: 'No JavaScript provided' });
  }

  try {
    const result = minify(inputJS);

    if (result.error) {
      return res.status(500).send({ error: result.error });
    }

    res.send({ minifiedJS: result.code });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Minify HTML
router.post('/api/minify/html', (req, res) => {
  const inputHTML = req.body.html;

  if (!inputHTML) {
    return res.status(400).send({ error: 'No HTML provided' });
  }

  try {
    const minifiedHTML = minifyHTML.minify(inputHTML, {
      removeAttributeQuotes: true,
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
      minifyJS: true
    });


    res.send({ minifiedHTML });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

const cron = require('node-cron');

// Function to find new articles based on user interests and send email notifications
async function sendUserInterestEmails() {
  try {
    // Fetch all users
    const users = await User.find().lean();

    // Iterate over each user
    for (let user of users) {
      if (user.interests && user.interests.length > 0) {
        // Find new articles that match the user's interests and have not been sent before
        const newArticles = await Article.find({
          $and: [
            { status: true },
            {
              $or: user.interests.map(keyword => ({
                $or: [
                  { title: new RegExp(keyword, 'i') },
                  { description: new RegExp(keyword, 'i') }
                ]
              }))
            },
            { _id: { $nin: user.sent_articles || [] } }
          ]
        }).sort({ created_time: -1 }).limit(1).lean(); // Limit to 1 article, most recent first

        // If there is a new article and one week has passed since the last email
        if (newArticles.length > 0) {
          const lastSentDate = user.last_sent_date || new Date(0); // Use epoch if no date
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          if (lastSentDate < oneWeekAgo) {
            const article = newArticles[0];

            sendMail({
              from: '"Grovix Lab" <noreply.grovix@gmail.com>',
              to: user.email,
              subject: "New Article Based on Your Interests",
              text: `Hello ${user.first_name},

We have found a new article that matches your interests:

${article.title}

Please visit our website to read more: https://www.grovixlab.com/page/${article.endpoint}

Thank you.

Best regards,
The Grovix Team`,

              html: `<p>Hello ${user.first_name},</p>
                     <p>We have found a new article that matches your interests:</p>
                     <h3>${article.title}</h3>
                     <p>${article.description}</p>
                     <a href="https://www.grovixlab.com/page/${article.endpoint}">Read more</a>
                     <p>Thank you.</p>
                     <p>Best regards,<br>The Grovix Lab Team</p>`,
            });

            // Update the user's sent_articles field and last_sent_date
            await User.updateOne(
              { _id: user._id },
              {
                $addToSet: { sent_articles: article._id },
                $set: { last_sent_date: new Date() }
              }
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Error sending interest-based emails:', error);
  }
}

// Schedule the function to run once a week
cron.schedule('0 0 * * 0', () => { // This cron expression runs at midnight every Sunday
  sendUserInterestEmails();
});

const zarviq = require('zarviq'); // For generating short unique IDs
const Url = require('../models/url'); // Assuming you have a URL model for database

// URL Shortener - POST Method to create a new short URL
router.post('/developer/tools/shorten/url', async (req, res, next) => {
    try { 
        const { originalUrl } = req.body;
        if (!originalUrl) {
            return res.status(400).json({ error: "Original URL is required" });
        }

        // Generate a short unique ID
        const shortId = zarviq.generateUniqueID();;

        // Create a new URL entry in the database
        const newUrl = new Url({
            originalUrl,
            shortUrl: `https://www.grovixlab.com/sht/${shortId}`,
            shortId
        });

        await newUrl.save();

        // Return the shortened URL
        res.status(201).json({
            message: "Short URL created successfully",
            shortUrl: newUrl.shortUrl
        });
    } catch (error) {
        next(error);
    }
});

// Redirect to the original URL using the short URL
router.get('/sht/:shortId', async (req, res, next) => {
  try {
      const { shortId } = req.params;
      
      // Find the URL entry in the database by the short ID
      const urlEntry = await Url.findOne({ shortId });
      
      if (!urlEntry) {
          return res.status(404).json({ error: "Short URL not found" });
      }
      
      // Redirect to the original URL
      res.redirect(urlEntry.originalUrl);
  } catch (error) {
      next(error);
  }
});

// const convertAllJpgToWebp = async (dir) => {
//   try {
//     // Check if the directory exists
//     if (!fs.existsSync(dir)) {
//       console.error(`Directory does not exist: ${dir}`);
//       return;
//     }

//     const files = fs.readdirSync(dir);
//     const jpgFiles = files.filter(file => path.extname(file).toLowerCase() === '.jpg');

//     for (const file of jpgFiles) {
//       const inputPath = path.join(dir, file);
//       const outputPath = path.join(dir, path.basename(file, '.jpg') + '.webp');

//       try {
//         await convertToWebp(inputPath, outputPath);
//         console.log(`Converted ${inputPath} to ${outputPath}`);
//       } catch (error) {
//         console.error(`Error converting ${inputPath}:`, error);
//       }
//     }
//   } catch (error) {
//     console.error('Error reading directory:', error);
//   }
// };

// Example usage
// const directoryPath = path.resolve(__dirname, '../public/img/user/'); // Adjust the path as needed
// console.log(directoryPath);
// convertAllJpgToWebp(directoryPath); 

module.exports = router;
