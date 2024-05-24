var express = require('express');
const crypash = require('crypash');
var router = express.Router();
const User = require('../models/user');
const Code = require('../models/code');
const Article = require('../models/article');
const ArticleBin = require('../models/bin');
const userBin = require('../models/userBin');
const Page = require('../models/page');
let mail = require('../email/config');
var geoip = require('geoip-lite');
let axios = require('axios');
let fs = require('fs');
let path = require('path');
let { sendMail } = require('../email/config')
const speakeasy = require('speakeasy');
// const sharp = require('sharp');


const { default: mongoose } = require('mongoose');
const { ObjectId } = require('mongodb');

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
    console.error("Error:", err);
  }
}

router.post('/auth/signup', isNotAuthorised, async (req, res, next) => {
  try {
    if (req.body.first_name && req.body.last_name && req.body.email && req.body.phone && req.body.password && req.body.terms_accept) {
      let userExist = await User.findOne({ email: req.body.email });
      if (!userExist) {
        const hashedPass = await crypash.hash('sha256', req.body.password);
        console.log(hashedPass);
        let userData = await {
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          email: req.body.email.toLowerCase(),
          contact_no: req.body.phone,
          password: hashedPass,
          date: new Date(),
          admin: false,
          verified: false,
          status: false,
          sex: '',
          bio: '',
          address: {
            address_line_one: "",
            addressline_two: "",
            country: "",
            state: "",
            city: "",
            zip_code: ""
          }
        };

        const user = new User(userData);
        await user.save();

        // Generate a TOTP code using the secret key 
        const code = await speakeasy.totp({

          // Use the Base32 encoding of the secret key 
          secret: secret.base32,

          // Tell Speakeasy to use the Base32  
          // encoding format for the secret key 
          encoding: 'base32'
        });

        let verification = {
          user_id: user._id,
          verification_code: code,
          created_time: new Date()
        }

        const verification_code = new Code(verification);
        await verification_code.save();
        console.log(verification_code);

        sendMail({
          from: '"Grovix Lab" noreply.grovix@gmail.com',
          to: userData.email,
          subject: "Your One-Time Verification Code",
          text: `Hello,
        
        Your verification code is: ${code}
        
        Please use this code to complete your verification process.
        
        Thank you,
        The Grovix Team`,
          html: `<p>Hello,</p>
                 <p>Your verification code is: <strong>${code}</strong></p>
                 <p>Please use this code to complete your verification process.</p>
                 <p>Thank you,<br>The Grovix Team</p>`,
        });

        res.render('user/verify', { title: "Verify Account", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, user_id: user._id });
      } else {
        if (userExist.verified) {
          res.render('user/signup', { title: "Signup", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, error: { message: 'User already exist, Please try to login.' } });
        } else {

          const hashedPass = await crypash.hash('sha256', req.body.password);

          let userData = await {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email.toLowerCase(),
            contact_no: req.body.phone,
            password: hashedPass,
            date: new Date(),
            admin: false,
            verified: false,
            status: false,
            sex: '',
            bio: '',
            address: {
              address_line_one: "",
              addressline_two: "",
              country: "",
              state: "",
              city: "",
              zip_code: ""
            }
          };

          let user = await User.updateOne({ _id: userExist._id }, userData);

          // Generate a TOTP code using the secret key 
          const code = await speakeasy.totp({

            // Use the Base32 encoding of the secret key 
            secret: secret.base32,

            // Tell Speakeasy to use the Base32  
            // encoding format for the secret key 
            encoding: 'base32'
          });

          let verification = {
            user_id: userExist._id.toString(),
            verification_code: code,
            created_time: new Date()
          }
          const one_time_code = await Code.updateOne({ user_id: userExist._id.toString() }, verification);

          sendMail({
            from: '"Grovix Lab" noreply.grovix@gmail.com',
            to: userData.email,
            subject: "Your One-Time Verification Code",
            text: `Hello,
          
          Your verification code is: ${code}
          
          Please use this code to complete your verification process.
          
          Thank you,
          The Grovix Team`,
            html: `<p>Hello,</p>
                   <p>Your verification code is: <strong>${code}</strong></p>
                   <p>Please use this code to complete your verification process.</p>
                   <p>Thank you,<br>The Grovix Team</p>`,
          });

          res.render('user/verify', { title: "Verify Account", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, user_id: userExist._id });
        }
      }
    } else {
      res.render('user/signup', { title: "Signup", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, error: { message: 'Please enter valid information.' } });
    }
  } catch (error) {
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
})

// Verify New User
router.post('/auth/user/verify/:user_id', isNotAuthorised, async (req, res, next) => {
  try {
    if (req.params.user_id && req.body.otp) {
      let verification = await Code.findOne({ user_id: req.params.user_id });
      if (req.body.otp == verification.verification_code) {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        console.log(clientIp);
        var geo = await geoip.lookup(clientIp);
        console.log(geo);
        let user = await User.updateOne({ _id: new mongoose.Types.ObjectId(req.params.user_id) }, { verified: true, status: true });
        let userData = await User.findOne({ _id: new mongoose.Types.ObjectId(req.params.user_id) });

        sendMail({
          from: '"Grovix Lab" <noreply.grovix@gmail.com>',
          to: userData.email,
          subject: "New Login/Signup Attempt Notification",
          text: `Hello,
      
      We noticed a new login or signup attempt to your account.
      
      Location: ${geo && geo.country ? geo.country : 'unknown'}, ${geo && geo.city ? geo.city : 'unknown'}, ${geo && geo.timezone ? geo.timezone : 'unknown'}.
      Latitude: ${geo && geo.range && geo.range[0] ? geo.range[0] : 'unknown'}.
      Longitude: ${geo && geo.range && geo.range[1] ? geo.range[1] : 'unknown'}.
      
      If this was you, no further action is needed. If you suspect any suspicious activity, please contact our support team immediately.
      
      Thank you,
      The Grovix Team`,
          html: `<p>Hello,</p>
                 <p>We noticed a new login or signup attempt to your account.</p>
                 <p>Location: <strong>${geo && geo.country ? geo.country : 'unknown'}, ${geo && geo.city ? geo.city : 'unknown'}, ${geo && geo.timezone ? geo.timezone : 'unknown'}</strong></p>
                 <p>Latitude: <strong>${geo && geo.range && geo.range[0] ? geo.range[0] : 'unknown'}</strong></p>
                 <p>Longitude: <strong>${geo && geo.range && geo.range[1] ? geo.range[1] : 'unknown'}</strong></p>
                 <p>If this was you, no further action is needed. If you suspect any suspicious activity, please contact our support team immediately.</p>
                 <p>Thank you,<br>The Grovix Team</p>`,
        });

        req.session.user = userData;
        res.redirect('/');
      } else {
        res.render('user/verify', { title: "Verify Account", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, user_id: req.params.user_id, error: { message: "Incorrect code" } });
      }
    } else {
      res.redirect('/auth/signup');
    }
  } catch (error) {
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
})


// login
router.post('/auth/login', isNotAuthorised, async (req, res, next) => {
  // res.render('user/login', { title: "Login", style: ['regform'], user: req.session && req.session.user ? req.session.user : false });
  try {
    if (req.body.email && req.body.password) {
      let user = await User.findOne({ email: req.body.email });
      if (!user) {
        res.render('user/login', { title: "Login", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, error: { message: "The account not exist, please try to signup." } });
      } else {
        let password_match = await crypash.check('sha256', req.body.password, user.password);
        if (password_match) {
          // Generate a TOTP code using the secret key 
          const code = await speakeasy.totp({

            // Use the Base32 encoding of the secret key 
            secret: secret.base32,

            // Tell Speakeasy to use the Base32  
            // encoding format for the secret key 
            encoding: 'base32'
          });

          let verification = {
            user_id: user._id.toString(),
            verification_code: code,
            created_time: new Date()
          }
          const one_time_code = await Code.updateOne({ user_id: user._id.toString() }, verification);

          sendMail({
            from: '"Grovix Lab" noreply.grovix@gmail.com',
            to: user.email,
            subject: "Your One-Time Verification Code",
            text: `Hello,
        
        Your verification code is: ${code}
        
        Please use this code to complete your verification process.
        
        Thank you,
        The Grovix Team`,
            html: `<p>Hello,</p>
                 <p>Your verification code is: <strong>${code}</strong></p>
                 <p>Please use this code to complete your verification process.</p>
                 <p>Thank you,<br>The Grovix Team</p>`,
          });

          res.render('user/verify', { title: "Verify Account", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, user_id: user._id });
        } else {
          res.render('user/login', { title: "Login", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, error: { message: "Password not match!" } });
        }
      }
    } else {
      res.render('user/login', { title: "Login", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, error: { message: "Please enter valid data" } });
    }
  } catch (error) {
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Logout
router.get('/logout', isAuthorised, async (req, res, next) => {
  try {
    // Store user details before destroying the session
    const userData = req.session.user;

    // Destroy the session
    req.session = null;

    // Send email notification to the user
    sendMail({
      from: '"Grovix Lab" <noreply.grovix@gmail.com>',
      to: userData.email,
      subject: "Your Account Has Been Logged Out",
      text: `Hello ${userData.first_name},

This is to inform you that your account has been logged out.

If this was not you or if you have any questions, please contact our support team for assistance.

Best regards,
The Grovix Team`,

      html: `<p>Hello ${userData.first_name},</p>
             <p>This is to inform you that your account has been <strong>logged out</strong>.</p>
             <p>If this was not you or if you have any questions, please contact our support team for assistance.</p>
             <p>Best regards,<br>The Grovix Team</p>`,
    });

    // Redirect to login page
    res.redirect('/auth/login');
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

    console.log(req.body);

    if (first_name && last_name && phone && sex && bio && address_line_one && address_line_two && country && state && city && zip_code) {
      console.log('hi');
      let userData = await {
        first_name: first_name,
        last_name: last_name,
        contact_no: phone,
        sex: sex,
        bio: bio,
        address: {
          address_line_one: address_line_one,
          addressline_two: address_line_two,
          country: country,
          state: state,
          city: city,
          zip_code: zip_code
        }
      };

      let user = await User.updateOne({ _id: new mongoose.Types.ObjectId(req.session.user._id) }, userData);
      user = await User.findOne({ _id: new mongoose.Types.ObjectId(req.session.user._id) }).lean();
      req.session.user = user;

      if (req.files && req.files.profile) {
        let profileFile = req.files.profile;
        let imagePath = await __dirname + '/../public/img/user/' + user._id + '.jpg';
        let profilePath = await __dirname + '/../public/img/user/' + user._id + '.jpg';

        profileFile.mv(imagePath, async function (err) {
          if (err) {
            return res.status(500).send("Error uploading profile image: " + err);
          }

          // Resize the image
          // sharp(imagePath)
          //   .resize(75, 75) // Set the width and height
          //   .toFile(profilePath, (err, info) => {
          //     if (err) {
          //       console.error(err);
          //     } else {
          //       res.redirect('/dashboard/settings');
          //     }
          //   });
          res.redirect('/dashboard/settings');

        });
      } else {
        res.redirect('/dashboard/settings');
      }

    } else {
      res.render('dashboard/settings', { title: "Settings >> Dashboard", style: ['dashboard', 'settings', 'regform'], user: req.session && req.session.user ? req.session.user : false, error: { message: "Please fill blank input box." } });
    }
  } catch (error) {
    console.log(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Article Request
router.post('/article/request', isAuthorised, async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      custom_category,
      content
    } = req.body;
    console.log(req.body);
    if (title && description && category && content) {

      let articleData = await {
        title: title,
        description: description,
        category: category == 'others' ? custom_category : category,
        body: content,
        author_id: req.session.user._id,
        status: false,
        created_time: new Date(),
        endpoint: await convertToSlug(title),
        views: 0
      }

      let article = await new Article(articleData);
      await article.save();

      if (req.files && req.files.thumbnail) {
        let thumbnailFile = req.files.thumbnail;
        let imagePath = await __dirname + '/../public/img/article/' + article._id + '.jpg';
        let thumbnailPath = await __dirname + '/../public/img/article/' + article._id + '.jpg';

        thumbnailFile.mv(imagePath, async function (err) {
          if (err) {
            return res.status(500).send("Error uploading profile image: " + err);
          }

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


          // Resize the image
          // sharp(imagePath)
          //   .resize(1920, 1080) // Set the width and height
          //   .toFile(thumbnailPath, (err, info) => {
          //     if (err) {
          //       console.error(err);
          //     } else {
          //       res.redirect('/dashboard/articles/pending');
          //     }
          //   });
          res.redirect('/dashboard/articles/pending');

        });
      }

    }

  } catch (error) {
    console.log(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Delete article
router.get('/article/delete/:article_id', isAuthorised, async (req, res, next) => {
  try {
    const articleId = req.params.article_id;
    const userId = req.session.user._id;

    if (articleId) {
      // Find the article by ID and author ID
      let article = await Article.findOneAndDelete({ _id: mongoose.Types.ObjectId(articleId), author_id: userId });

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
    console.log(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Admin delete article
router.get('/article/admin/delete/:article_id', isAuthorised, async (req, res, next) => {
  try {
    const articleId = req.params.article_id;
    const adminUserId = req.session.user._id;

    if (articleId) {
      // Check if the user is an admin
      const user = await User.findOne({ _id: mongoose.Types.ObjectId(adminUserId) }).lean();
      if (user && user.admin) {
        // Find the article
        const article = await Article.findOneAndDelete({ _id: mongoose.Types.ObjectId(articleId) });

        if (article) {
          // Move the article to the ArticleBin
          const deletedArticle = new ArticleBin(article.toObject());
          await deletedArticle.save();

          // Find the article's author to send the notification email
          const author = await User.findOne({ _id: mongoose.Types.ObjectId(article.author_id) }).lean();

          if (author) {
            // Send email notification to the article's author
            sendMail({
              from: '"Grovix Lab" <noreply.grovix@gmail.com>',
              to: author.email,
              subject: "Your Article Has Been Deleted by Admin",
              text: `Hello ${author.first_name},

This is to inform you that your article titled "${article.title}" has been deleted by an admin.

If you have any questions, please contact our support team for assistance.

Thank you for your understanding.

Best regards,
The Grovix Team`,

              html: `<p>Hello ${author.first_name},</p>
                     <p>This is to inform you that your article titled "<strong>${article.title}</strong>" has been deleted by an admin.</p>
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
    console.log(error);
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
    console.log(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Lock article
router.get('/article/admin/block/:article_id', isAuthorised, async (req, res, next) => {
  try {
    const articleId = req.params.article_id;
    const adminUserId = req.session.user._id;

    if (articleId) {
      // Check if the user is an admin
      const user = await User.findOne({ _id: mongoose.Types.ObjectId(adminUserId) });
      if (user && user.admin) {
        // Lock the article by updating its status
        const article = await Article.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(articleId) },
          { status: 'locked' },
          { new: true }
        );

        if (article) {
          // Find the article's author to send the notification email
          const author = await User.findOne({ _id: mongoose.Types.ObjectId(article.author_id) }).lean();

          if (author) {
            // Send email notification to the article's author
            sendMail({
              from: '"Grovix Lab" <noreply.grovix@gmail.com>',
              to: author.email,
              subject: "Your Article Has Been Locked",
              text: `Hello ${author.first_name},

This is to inform you that your article titled "${article.title}" has been locked by an admin.

If you have any questions or believe this to be a mistake, please contact our support team for assistance.

Thank you for your understanding.

Best regards,
The Grovix Team`,

              html: `<p>Hello ${author.first_name},</p>
                     <p>This is to inform you that your article titled "<strong>${article.title}</strong>" has been locked by an admin.</p>
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
    console.log(error);
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
      const user = await User.findOne({ _id: mongoose.Types.ObjectId(adminUserId) });
      if (user && user.admin) {
        // Unlock the article by updating its status
        const article = await Article.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(articleId) },
          { status: true }, // Assuming 'unlocked' is the status you want to set
          { new: true }
        );

        if (article) {
          // Find the article's author to send the notification email
          const author = await User.findOne({ _id: mongoose.Types.ObjectId(article.author_id) }).lean();

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
    console.log(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Update article 
router.post('/article/update/:article_id', isAuthorised, async (req, res, next) => {
  try {
    const { title, description, category, content } = req.body;
    let updateData = {
      title,
      description,
      category,
      body: content,
      updated_at: new Date(),
      status: false
    };
    if (title && description && category && content && updateData.updated_at) {
      let article = await Article.findOne({ _id: new mongoose.Types.ObjectId(req.params.article_id), author_id: req.session.user._id }).lean();
      if (article) {
        await Article.updateOne({ _id: new mongoose.Types.ObjectId(req.params.article_id) }, updateData);
        if (req.files && req.files.thumbnail) {
          let thumbnailFile = req.files.thumbnail;
          let imagePath = await __dirname + '/../public/img/article/' + article._id + '.jpg';
          let thumbnailPath = await __dirname + '/../public/img/article/' + article._id + '.jpg';

          thumbnailFile.mv(imagePath, async function (err) {
            if (err) {
              return res.status(500).send("Error uploading profile image: " + err);
            }

            // Resize the image
            // sharp(imagePath)
            //   .resize(1920, 1080) // Set the width and height
            //   .toFile(thumbnailPath, (err, info) => {
            //     if (err) {
            //       console.error(err);
            //     } else {
            //       res.redirect('/dashboard/articles');
            //     }
            //   });

            // Send email notification to the author
            sendMail({
              from: '"Grovix Lab" <noreply.grovix@gmail.com>',
              to: req.session.user.email,
              subject: "Your Article Edits Have Been Requested for Review",
              text: `Hello ${req.session.user.first_name},

Your article titled "${article.title}" has been updated and requested for review. Until the review is complete, your article will be private.

If you have any questions, please contact our support team for assistance.

Thank you for your understanding.

Best regards,
The Grovix Team`,

              html: `<p>Hello ${req.session.user.first_name},</p>
                 <p>Your article titled "<strong>${article.title}</strong>" has been updated and requested for review. Until the review is complete, your article will be private.</p>
                 <p>If you have any questions, please contact our support team for assistance.</p>
                 <p>Thank you for your understanding.</p>
                 <p>Best regards,<br>The Grovix Team</p>`,
            });


            res.redirect('/dashboard/articles');

          });
        } else {
          // Send email notification to the author
          sendMail({
            from: '"Grovix Lab" <noreply.grovix@gmail.com>',
            to: req.session.user.email,
            subject: "Your Article Edits Have Been Requested for Review",
            text: `Hello ${req.session.user.first_name},

Your article titled "${article.title}" has been updated and requested for review. Until the review is complete, your article will be private.

If you have any questions, please contact our support team for assistance.

Thank you for your understanding.

Best regards,
The Grovix Team`,

            html: `<p>Hello ${req.session.user.first_name},</p>
                 <p>Your article titled "<strong>${article.title}</strong>" has been updated and requested for review. Until the review is complete, your article will be private.</p>
                 <p>If you have any questions, please contact our support team for assistance.</p>
                 <p>Thank you for your understanding.</p>
                 <p>Best regards,<br>The Grovix Team</p>`,
          });


          res.redirect('/dashboard/articles');
        }
      }
    }
    res.render('dashboard/edit', { title: article.title, style: ['dashboard', 'regform'], article, user: req.session && req.session.user ? req.session.user : false });
  } catch (error) {
    console.error(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Block or Unblock User
router.post('/admin/users/block/:user_id', isAdmin, async (req, res, next) => {
  try {
    const userId = req.params.user_id;

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

This is to inform you that your account has been ${user.status ? "unblocked" : "blocked"} by an admin.

If you have any questions or believe this to be a mistake, please contact our support team for assistance.

Thank you for your understanding.

Best regards,
The Grovix Team`,

        html: `<p>Hello ${user.first_name},</p>
               <p>This is to inform you that your account has been <strong>${user.status ? "unblocked" : "blocked"}</strong> by an admin.</p>
               <p>If you have any questions or believe this to be a mistake, please contact our support team for assistance.</p>
               <p>Thank you for your understanding.</p>
               <p>Best regards,<br>The Grovix Team</p>`,
      });

      res.redirect('/admin/users');
    } else {
      res.redirect('/admin/users?error=User not found');
    }
  } catch (error) {
    console.log(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
  }
});

// Ban User
router.post('/admin/users/ban/:user_id', isAdmin, async (req, res, next) => {
  try {
    const userId = req.params.user_id;

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

This is to inform you that your account has been banned by an admin.

If you have any questions or believe this to be a mistake, please contact our support team for assistance.

Thank you for your understanding.

Best regards,
The Grovix Team`,

        html: `<p>Hello ${user.first_name},</p>
               <p>This is to inform you that your account has been <strong>banned</strong> by an admin.</p>
               <p>If you have any questions or believe this to be a mistake, please contact our support team for assistance.</p>
               <p>Thank you for your understanding.</p>
               <p>Best regards,<br>The Grovix Team</p>`,
      });

      res.redirect('/admin/users');
    } else {
      res.redirect('/admin/users?error=User not found');
    }
  } catch (error) {
    console.log(error);
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
    console.log(error);
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
      const page = await new Page({ user_id: user._id, created_time: new Date() });
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
    console.log(error);
    res.render('error', {
      title: "500",
      status: 500,
      message: error.message,
      style: ['error'],
      user: req.session && req.session.user ? req.session.user : false
    });
  }
});

module.exports = router;
