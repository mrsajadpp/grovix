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

// Signup Route
router.post('/auth/signup', isNotAuthorised, async (req, res, next) => {
    const { first_name, last_name, email, phone, password, terms_accept, country_code } = req.body;

    // Form validation
    if (!first_name) {
        return res.render('user/signup', { title: "Signup", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, data: req.body, error: { message: 'First name is required.' } });
    }
    if (!last_name) {
        return res.render('user/signup', { title: "Signup", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, data: req.body, error: { message: 'Last name is required.' } });
    }
    if (!email) {
        return res.render('user/signup', { title: "Signup", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, data: req.body, error: { message: 'Email is required.' } });
    }
    if (!phone) {
        return res.render('user/signup', { title: "Signup", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, data: req.body, error: { message: 'Phone number is required.' } });
    }
    if (!password) {
        return res.render('user/signup', { title: "Signup", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, data: req.body, error: { message: 'Password is required.' } });
    }
    if (!terms_accept) {
        return res.render('user/signup', { title: "Signup", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, data: req.body, error: { message: 'You must accept the terms and conditions.' } });
    }
    if (!country_code) {
        return res.render('user/signup', { title: "Signup", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, data: req.body, error: { message: 'Country code is required.' } });
    }

    try {
        let userExist = await User.findOne({ email: email.toLowerCase() }).lean();
        if (!userExist) {
            try {
                const hashedPass = await crypash.hash('sha256', password);
                const userData = {
                    first_name,
                    last_name,
                    email: email.toLowerCase(),
                    contact_no: country_code + ' ' + phone,
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
                const code = speakeasy.totp({
                    secret: secret.base32, // Ensure 'secret' is defined
                    encoding: 'base32'
                });

                const verification = {
                    user_id: user._id,
                    verification_code: code,
                    created_time: new Date()
                };

                const verification_code = new Code(verification);
                await verification_code.save();

                sendMail({
                    from: '"Grovix Lab" <noreply.grovix@gmail.com>',
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
            } catch (error) {
                console.error('Error saving user or sending verification email:', error);
                res.render('error', { title: "500", status: 500, message: 'Error saving user or sending verification email.', style: ['error'], user: req.session && req.session.user ? req.session.user : false });
            }
        } else {
            try {
                if (userExist.verified) {
                    res.render('user/signup', { title: "Signup", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, data: req.body, error: { message: 'User already exists, please try to login.' } });
                } else {
                    const hashedPass = await crypash.hash('sha256', password);
                    const userData = {
                        first_name,
                        last_name,
                        email: email.toLowerCase(),
                        contact_no: country_code + ' ' + phone,
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

                    await User.updateOne({ _id: userExist._id }, userData);

                    const code = speakeasy.totp({
                        secret: secret.base32,
                        encoding: 'base32'
                    });

                    const verification = {
                        user_id: userExist._id.toString(),
                        verification_code: code,
                        created_time: new Date()
                    };

                    await Code.updateOne({ user_id: userExist._id.toString() }, verification);

                    sendMail({
                        from: '"Grovix Lab" <noreply.grovix@gmail.com>',
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
            } catch (error) {
                console.error('Error updating user or sending verification email:', error);
                res.render('error', { title: "500", status: 500, message: 'Error updating user or sending verification email.', style: ['error'], user: req.session && req.session.user ? req.session.user : false });
            }
        }
    } catch (error) {
        console.error('Error checking user existence:', error);
        res.render('error', { title: "500", status: 500, message: 'Error checking user existence.', style: ['error'], user: req.session && req.session.user ? req.session.user : false });
    }
});


// Verify New User
router.post('/auth/user/verify/:user_id', isNotAuthorised, async (req, res, next) => {
    try {
        if (req.params.user_id && req.body.otp) {
            let verification = await Code.findOne({ user_id: req.params.user_id });
            if (req.body.otp == verification.verification_code) {
                const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                var geo = await geoip.lookup(clientIp);
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

                const {
                    address,
                    _id,
                    first_name,
                    last_name,
                    email,
                    contact_no,
                    date,
                    admin,
                    verified,
                    status,
                    bio,
                    sex
                } = await userData.toObject();

                const newData = await {
                    address,
                    _id,
                    first_name,
                    last_name,
                    email,
                    contact_no,
                    date,
                    admin,
                    verified,
                    status,
                    bio,
                    sex
                };

                req.session.user = await newData;
                res.redirect('/');
            } else {
                res.render('user/verify', { title: "Verify Account", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, user_id: req.params.user_id, error: { message: "Incorrect code" } });
            }
        } else {
            res.redirect('/auth/signup');
        }
    } catch (error) {
        console.error(error);
        res.render('error', { title: "500", status: 500, message: error.message, style: ['error'], user: req.session && req.session.user ? req.session.user : false });
    }
})


// login
router.post('/auth/login', isNotAuthorised, async (req, res, next) => {
    const { email, password } = req.body;

    // Form validation
    if (!email) {
        return res.render('user/login', { title: "Login", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, data: req.body, error: { message: 'Email is required.' } });
    }
    if (!password) {
        return res.render('user/login', { title: "Login", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, data: req.body, error: { message: 'Password is required.' } });
    }

    try {
        let user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.render('user/login', { title: "Login", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, data: req.body, error: { message: "The account does not exist, please try to signup." } });
        } else {
            let password_match = await crypash.check('sha256', password, user.password);
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
                };
                const one_time_code = await Code.updateOne({ user_id: user._id.toString() }, verification);

                sendMail({
                    from: '"Grovix Lab" <noreply.grovix@gmail.com>',
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
                res.render('user/login', { title: "Login", style: ['regform'], user: req.session && req.session.user ? req.session.user : false, error: { message: "Password does not match!" } });
            }
        }
    } catch (error) {
        console.error(error);
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

async function convertEmailsToLowerCase() {
    try {
        // Find all users
        const users = await User.find();

        // Iterate through each user and update the email to lowercase
        for (const user of users) {
            const lowercaseEmail = user.email.toLowerCase();
            if (user.email !== lowercaseEmail) {
                user.email = lowercaseEmail;
                await user.save();
                console.log(`Updated email for user ${user._id}: ${lowercaseEmail}`);
            }
        }

        console.log('All emails have been converted to lowercase.');
    } catch (error) {
        console.error('Error converting emails:', error);
    } finally {
        // Close the MongoDB connection
        mongoose.connection.close();
    }
}

// Run the function
convertEmailsToLowerCase();

module.exports = router;