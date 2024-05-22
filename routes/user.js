var express = require('express');
const crypash = require('crypash');
var router = express.Router();
const User = require('../models/user');
const Code = require('../models/code');
let mail = require('../email/config');
var geoip = require('geoip-lite');
let axios = require('axios');
const speakeasy = require('speakeasy');

const { default: mongoose } = require('mongoose');

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
      } else {
        if (userExist.verified) {
          console.log('one');
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
          console.log(one_time_code);
          console.log(code);
        }
      }
    } else {
      res.render('user/signup', { title: "Signup", style: ['regform'], user: req.session.user ? req.session.user : false, error: { message: 'Please enter valid information.' } });
    }
  } catch (error) {
    res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session.user ? req.session.user : false });
  }
})


module.exports = router;
