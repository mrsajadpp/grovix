var express = require('express');
const crypash = require('crypash');
var router = express.Router();
const User = require('../models/user');
const Code = require('../models/code');
const Article = require('../models/article');
let mail = require('../email/config');
var geoip = require('geoip-lite');
let axios = require('axios');
let fs = require('fs');
let path = require('path');
let { sendMail } = require('../email/config')
const speakeasy = require('speakeasy');
const sharp = require('sharp');


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
          email: req.body.email,
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

        res.render('user/verify', { title: "Verify Account", style: ['regform'], user: req.session.user ? req.session.user : false, user_id: user._id });
      } else {
        if (userExist.verified) {
          res.render('user/signup', { title: "Signup", style: ['regform'], user: req.session.user ? req.session.user : false, error: { message: 'User already exist, Please try to login.' } });
        } else {

          const hashedPass = await crypash.hash('sha256', req.body.password);

          let userData = await {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
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

          res.render('user/verify', { title: "Verify Account", style: ['regform'], user: req.session.user ? req.session.user : false, user_id: userExist._id });
        }
      }
    } else {
      res.render('user/signup', { title: "Signup", style: ['regform'], user: req.session.user ? req.session.user : false, error: { message: 'Please enter valid information.' } });
    }
  } catch (error) {
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
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
        res.render('user/verify', { title: "Verify Account", style: ['regform'], user: req.session.user ? req.session.user : false, user_id: req.params.user_id, error: { message: "Incorrect code" } });
      }
    } else {
      res.redirect('/auth/signup');
    }
  } catch (error) {
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
  }
})


// login
router.post('/auth/login', isNotAuthorised, async (req, res, next) => {
  // res.render('user/login', { title: "Login", style: ['regform'], user: req.session.user ? req.session.user : false });
  try {
    if (req.body.email && req.body.password) {
      let user = await User.findOne({ email: req.body.email });
      if (!user) {
        res.render('user/login', { title: "Login", style: ['regform'], user: req.session.user ? req.session.user : false, error: { message: "The account not exist, please try to signup." } });
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

          res.render('user/verify', { title: "Verify Account", style: ['regform'], user: req.session.user ? req.session.user : false, user_id: user._id });
        } else {
          res.render('user/login', { title: "Login", style: ['regform'], user: req.session.user ? req.session.user : false, error: { message: "Password not match!" } });
        }
      }
    } else {
      res.render('user/login', { title: "Login", style: ['regform'], user: req.session.user ? req.session.user : false, error: { message: "Please enter valid data" } });
    }
  } catch (error) {
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
  }
});

// Logout
router.get('/logout', isAuthorised, (req, res, next) => {
  try {
    req.session = null;
    res.redirect('/auth/login');
  } catch (error) {
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
  }
});


// Edit Profile
router.post('/profile/edit', isAuthorised, async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      email,
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

    if (first_name && last_name && email && phone && sex && bio && address_line_one && address_line_two && country && state && city && zip_code) {
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
      user = await User.findOne({ _id: new mongoose.Types.ObjectId(req.session.user._id) });
      req.session.user = user;

      if (req.files && req.files.profile) {
        let profileFile = req.files.profile;
        let imagePath = await __dirname + '/../public/img/user/' + user._id + '.jpg';
        let profilePath = await __dirname + '/../public/img/user/' + user._id + '-75x75.jpg';

        profileFile.mv(imagePath, async function (err) {
          if (err) {
            return res.status(500).send("Error uploading profile image: " + err);
          }

          // Resize the image
          sharp(imagePath)
            .resize(75, 75) // Set the width and height
            .toFile(profilePath, (err, info) => {
              if (err) {
                console.error(err);
              } else {
                res.redirect('/dashboard/settings');
              }
            });

        });
      } else {
        res.redirect('/dashboard/settings');
      }

    } else {
      res.render('dashboard/settings', { title: "Settings >> Dashboard", style: ['dashboard', 'settings', 'regform'], user: req.session.user ? req.session.user : false, error: { message: "Please fill blank input box." } });
    }
  } catch (error) {
    console.log(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
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
        let thumbnailPath = await __dirname + '/../public/img/article/' + article._id + '-1920x1080.jpg';

        thumbnailFile.mv(imagePath, async function (err) {
          if (err) {
            return res.status(500).send("Error uploading profile image: " + err);
          }

          // Resize the image
          sharp(imagePath)
            .resize(1920, 1080) // Set the width and height
            .toFile(thumbnailPath, (err, info) => {
              if (err) {
                console.error(err);
              } else {
                res.redirect('/dashboard/articles/pending');
              }
            });

        });
      }

    }

  } catch (error) {
    console.log(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
  }
});

// Delete article
router.get('/article/delete/:article_id', isAuthorised, async (req, res, next) => {
  try {
    if (req.params.article_id) {
      await Article.deleteOne({ _id: new mongoose.Types.ObjectId(req.params.article_id), author_id: req.session.user._id });
      res.redirect('/dashboard/articles');
    }
  } catch (error) {
    console.log(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
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
          let thumbnailPath = await __dirname + '/../public/img/article/' + article._id + '-1920x1080.jpg';

          thumbnailFile.mv(imagePath, async function (err) {
            if (err) {
              return res.status(500).send("Error uploading profile image: " + err);
            }

            // Resize the image
            sharp(imagePath)
              .resize(1920, 1080) // Set the width and height
              .toFile(thumbnailPath, (err, info) => {
                if (err) {
                  console.error(err);
                } else {
                  res.redirect('/dashboard/articles');
                }
              });

          });
        } else {
          res.redirect('/dashboard/articles');
        }
      }
    }
    res.render('dashboard/edit', { title: article.title, style: ['dashboard', 'regform'], article, user: req.session.user ? req.session.user : false });
  } catch (error) {
    console.error(error);
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
  }
});

module.exports = router;
