var express = require('express');
const crypash = require('crypash');
var router = express.Router();
let db = require('../db/config');
let mail = require('../mail/config');
let Razorpay = require('razorpay');
var bcrypt = require('bcrypt');
var crypto = require('crypto');
var geoip = require('geoip-lite');
let axios = require('axios');

var razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const { default: mongoose } = require('mongoose');

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


router.post('/auth/login', async function (req, res, next) {
  try {
    const userCollection = db.get().collection('USER');
    const userExist = await userCollection.findOne({ email: req.body.email, status: true });
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(clientIp);
    var geo = await geoip.lookup(clientIp);
    console.log(geo);


    if (userExist) {
      let isCorrect = await crypash.check('sha256', req.body.password, userExist.password);
      if (isCorrect) {
        req.session.user = userExist;
        await mail.sendMail({
          from: '"Elegant Purse" <thintryin@gmail.com>',
          to: userExist.email,
          subject: "New Login Alert for Your Elegant Purse Account",
          text: "Hello " + userExist.first_name + ",\n\nA new login was detected on your Elegant Purse account from the following location:\nLocation: " + (geo && geo.city ? geo.city + `(${geo.region}), ${geo.country}.` : 'Unidentified') + "\n\nIf this was you, no further action is required.\n\nIf you didn't initiate this login, please reset your password immediately.\n\nBest regards,\nThe Elegant Purse Team",
          html: "<p>Hello " + userExist.first_name + ",</p><p>A new login was detected on your Elegant Purse account from the following location:</p><p><strong>Location:</strong> " + (geo && geo.city ? geo.city + `(${geo.region}), ${geo.country}.` : 'Unidentified') + "</p><p>If this was you, no further action is required.</p><p>If you didn't initiate this login, please reset your password immediately.</p><p>Best regards,<br/>The Elegant Purse Team</p>"
        });

        res.redirect('/');
      } else {
        res.render('user/login', { title: 'Login - Elegent Purse', description: "Login to your Elegent Purse account for a seamless shopping experience. Access your saved favorites, manage your orders, and enjoy faster checkouts.", keywords: "login, sign in, member login, account access, secure login, fast checkout, manage orders, wishlist access, exclusive benefits, Elegent Purse login, Elegent Purse member account", auth: true, error: { status: true, message: "Invalid password or email" } });
      }
    } else {
      res.render('user/login', { title: 'Login - Elegent Purse', description: "Login to your Elegent Purse account for a seamless shopping experience. Access your saved favorites, manage your orders, and enjoy faster checkouts.", keywords: "login, sign in, member login, account access, secure login, fast checkout, manage orders, wishlist access, exclusive benefits, Elegent Purse login, Elegent Purse member account", auth: true, error: { status: true, message: "Invalid password or email" } });
    }
  } catch (err) {
    console.error("Error inserting user:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});

router.post('/auth/signup', async function (req, res, next) {
  try {
    const userCollection = db.get().collection('USER');
    const userExist = req.body.email ? await userCollection.findOne({ email: req.body.email, status: true }) : req.session.user;
    const userExistNotVerified = await userCollection.findOne({ email: req.body.email, status: false });
    if (!req.body.otp) {
      if (!userExist) {
        if (userExistNotVerified) {
          // Generate 6-digit OTP
          let otp = Math.floor(100000 + Math.random() * 900000);
          const hashedPassword = await crypash.hash('sha256', req.body.password);

          // Check if OTP expired
          if (userExistNotVerified && userExistNotVerified.otp_expiry && userExistNotVerified.otp_expiry > new Date()) {
            otp = Math.floor(100000 + Math.random() * 900000); // Generate new OTP
          }

          if (userExistNotVerified.otp_expiry > new Date()) {
            otp = userExistNotVerified.otp;
          }

          // Create new user document
          const newUser = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
            phone: req.body.phone,
            password: hashedPassword,
            status: false,
            admin: false,
            otp: otp,
            otp_expiry: new Date(Date.now() + 5 * 60 * 1000) // OTP expiry after 5 minutes
          };

          await mail.sendMail({
            from: '"Elegent Purse" <thintryin@gmail.com>',
            to: newUser.email,
            subject: "Your OTP for Elegent Purse",
            text: "Hello " + newUser.first_name + ",\n\nYour OTP for Elegent Purse is: " + newUser.otp + "\n\nThis OTP is valid for 5 minutes.\n\nIf you didn't request this OTP, please ignore this email.\n\nBest regards,\nThe Elegent Purse Team",
            html: "<p>Hello " + newUser.first_name + ",</p><p>Your OTP for Elegent Purse is: <strong>" + newUser.otp + "</strong></p><p>This OTP is valid for 5 minutes.</p><p>If you didn't request this OTP, please ignore this email.</p><p>Best regards,<br/>The Elegent Purse Team</p>"
          });

          await userCollection.updateOne({ email: req.body.email }, { $set: newUser });

          console.log(newUser);
          req.session.user = newUser;
          res.render('user/otp', { title: 'Verify OTP - Elegent Purse', auth: true })
        } else {
          // Generate 6-digit OTP
          const otp = Math.floor(100000 + Math.random() * 900000);
          const hashedPassword = await crypash.hash('sha256', req.body.password);

          // Create new user document
          const newUser = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
            phone: req.body.phone,
            password: hashedPassword,
            status: false,
            admin: false,
            otp: otp,
            otp_expiry: new Date(Date.now() + 5 * 60 * 1000) // OTP expiry after 5 minutes
          };

          await mail.sendMail({
            from: '"Elegent Purse" <thintryin@gmail.com>',
            to: newUser.email,
            subject: "Your OTP for Elegent Purse",
            text: "Hello " + newUser.first_name + ",\n\nYour OTP for Elegent Purse is: " + newUser.otp + "\n\nThis OTP is valid for 5 minutes.\n\nIf you didn't request this OTP, please ignore this email.\n\nBest regards,\nThe Elegent Purse Team",
            html: "<p>Hello " + newUser.first_name + ",</p><p>Your OTP for Elegent Purse is: <strong>" + newUser.otp + "</strong></p><p>This OTP is valid for 5 minutes.</p><p>If you didn't request this OTP, please ignore this email.</p><p>Best regards,<br/>The Elegent Purse Team</p>"
          });

          await userCollection.insertOne(newUser);

          console.log(newUser);

          req.session.user = newUser;
          res.render('user/otp', { title: 'Verify OTP - Elegent Purse', auth: true });
        }
      } else {
        res.render('user/signup', {
          title: 'SignUp - Elegent Purse',
          description: "Sign up for an account to enjoy a personalized shopping experience and keep track of your purchases.",
          keywords: "signup, create account, register, new user, faster checkout, manage orders, save wishlist, exclusive benefits, personalized experience, Elegent Purse signup, Elegent Purse member account",
          auth: true,
          error: {
            status: true,
            message: "User already exist with this email"
          }
        })
      }
    } else {
      if (userExist && req.body.otp == userExist.otp) {
        // Create new user document
        const newUser = {
          first_name: userExist.first_name,
          last_name: userExist.last_name,
          email: userExist.email,
          phone: userExist.phone,
          password: userExist.password,
          status: true,
          admin: false,
          timestamp: new Date()
        };

        await userCollection.updateOne({ email: userExist.email }, { $set: newUser });

        req.session.user = newUser;
        res.redirect('/user/auth/address');
      } else {
        res.render('user/otp', { title: 'Verify OTP - Elegent Purse', error: { status: true, message: "Invalid OTP" }, auth: true });
      }
    }
  } catch (err) {
    console.error("Error inserting user:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});

router.post('/auth/address', isAuthorised, async function (req, res, next) {
  try {
    const userCollection = db.get().collection('USER');
    const addCollection = db.get().collection('ADDRESS');
    const userExist = await userCollection.findOne({ email: req.session.user.email, status: true });
    const adressExist = await addCollection.findOne({ user_id: userExist._id });

    const address = {
      name: `${userExist.first_name} ${userExist.last_name}`,
      user_id: userExist._id,
      address_line_one: req.body.address_line_one,
      address_line_two: req.body.address_line_two,
      city: req.body.city,
      state: req.body.state,
      land_mark: req.body.landmark,
      zip_code: req.body.zip_code,
      gender: req.body.gender
    }

    if (adressExist) {
      addCollection.updateOne({ user_id: userExist._id }, { $set: address });
    } else {
      await addCollection.insertOne(address);
    }

    res.redirect('/');
  } catch (err) {
    console.error("Error inserting user:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});

// GET SignUp Address Page
router.post('/auth/address/update', isAuthorised, async function (req, res, next) {
  try {
    const userCollection = db.get().collection('USER');
    const addCollection = db.get().collection('ADDRESS');
    const userExist = await userCollection.findOne({ email: req.session.user.email, status: true });

    const address = {
      name: `${req.body.first_name} ${req.body.last_name}`,
      user_id: userExist._id,
      address_line_one: req.body.address_line_one,
      address_line_two: req.body.address_line_two,
      city: req.body.city,
      state: req.body.state,
      land_mark: req.body.landmark,
      zip_code: req.body.zip_code,
      gender: req.body.gender
    }

    const newUser = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: userExist.email,
      phone: req.body.phone,
      password: userExist.password,
      status: true,
      admin: userExist.admin,
      timestamp: userExist.timestamp
    };

    await userCollection.updateOne({ email: userExist.email }, { $set: newUser });
    await addCollection.updateOne({ user_id: userExist._id }, { $set: address });
    newUser._id = req.session.user._id;
    req.session.user = newUser;
    res.redirect('/user/profile');

  } catch (err) {
    console.error("Error inserting user:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});


// GET Generate Page
router.post('/auth/recover', isNotAuthorised, async function (req, res, next) {
  try {
    const userCollection = db.get().collection('USER');
    const pageCollection = db.get().collection('PAGE');
    const userExist = await userCollection.findOne({ email: req.body.email });
    if (userExist) {
      await pageCollection.deleteOne({ user_id: userExist._id });
      const date = new Date();
      const oneTimeCode = generateOneTimeCode(userExist._id, date);
      console.log("One-time code:", oneTimeCode);

      const newPage = {
        user_id: userExist._id,
        page_id: oneTimeCode,
        status: true,
        timestamp: new Date()
      }

      await pageCollection.insertOne(newPage);


      await mail.sendMail({
        from: '"Elegent Purse" <thintryin@gmail.com>',
        to: userExist.email,
        subject: "Reset Your Password",
        text: `Hello ${userExist.first_name},
    
    You have requested to reset your password for your Elegent Purse account.
    
    To proceed with the password reset, please click on the following link:
    https://elegentpurse.com/reset/${oneTimeCode}
    
    Please note that this link is valid for a single use and will expire after it has been used or after a certain period of time.
    
    If you did not request this password reset, please ignore this email. Your account security may have been compromised if you receive this email unexpectedly.
    
    Thank you for using Elegent Purse.
    
    Best Regards,
    The Elegent Purse Team`,
        html: `<p>Hello ${userExist.first_name},</p>
    <p>You have requested to reset your password for your Elegent Purse account.</p>
    <p>To proceed with the password reset, please click on the following link:</p>
    <p><a href="http://elegentpurse.com/reset/${oneTimeCode}">Reset Password</a></p>
    <p>Please note that this link is valid for a single use and will expire after it has been used or after a certain period of time.</p>
    <p>If you did not request this password reset, please ignore this email. Your account security may have been compromised if you receive this email unexpectedly.</p>
    <p>Thank you for using Elegent Purse.</p>
    <p>Best Regards,<br/>The Elegent Purse Team</p>`
      });

      res.redirect('/auth/login');
    } else {
      res.render('user/forgot', { title: 'Reset Password - Elegent Purse', auth: true, error: { status: true, message: "User not exist" } })
    }
  } catch (err) {
    console.error("Error inserting user:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});

// GET Password Change
router.post('/password/change', isNotAuthorised, async function (req, res, next) {
  try {
    const userCollection = db.get().collection('USER');
    const pageCollection = db.get().collection('PAGE');
    const pageExist = await pageCollection.findOne({ page_id: req.body.page_id });
    const userExist = await userCollection.findOne({ _id: pageExist.user_id });

    if (pageExist) {
      const hashedPassword = await crypash.hash('sha256', req.body.password);

      // Create new user document
      const newUser = {
        first_name: userExist.first_name,
        last_name: userExist.last_name,
        email: userExist.email,
        phone: userExist.phone,
        password: hashedPassword,
        status: userExist.status,
        admin: userExist.admin,
        otp: userExist.otp,
        otp_expiry: userExist.otp_expiry // OTP expiry after 5 minutes
      };

      await userCollection.updateOne({ email: userExist.email }, { $set: newUser });
      await pageCollection.deleteOne({ user_id: userExist._id });

      await mail.sendMail({
        from: '"Elegent Purse" <thintryin@gmail.com>',
        to: userExist.email,
        subject: "Password Changed",
        text: `Hello ${userExist.first_name},
    
    Your password for your Elegent Purse account has been successfully changed.
    
    If you did not make this change, please contact us immediately.
    
    Thank you for using Elegent Purse.
    
    Best Regards,
    The Elegent Purse Team`,
        html: `<p>Hello ${userExist.first_name},</p>
    
    <p>Your password for your Elegent Purse account has been successfully changed.</p>
    
    <p>If you did not make this change, please contact us immediately.</p>
    
    <p>Thank you for using Elegent Purse.</p>
    
    <p>Best Regards,<br/>The Elegent Purse Team</p>`
      });


      res.redirect('/auth/login');
    } else {
      res.status(404)
    }
    res.render('user/forgot', { title: 'Reset Password - Elegent Purse', auth: true })
  } catch (err) {
    console.error("Error inserting user:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});

// Create Order
router.post('/checkout', isAuthorised, async function (req, res, next) {
  try {
    const CartModel = db.get().collection('CART');
    const ProductModel = db.get().collection('PRODUCT');
    const addCollection = db.get().collection('ADDRESS');
    const userCollection = db.get().collection('USER');

    const user = userCollection.findOne({ _id: new mongoose.Types.ObjectId(req.body.user_id) });

    // Fetch user's address
    const address = await addCollection.findOne({ user_id: new mongoose.Types.ObjectId(req.body.user_id) });

    // Fetch cart items for the current user
    const cartItems = await CartModel.find({ user_id: new mongoose.Types.ObjectId(req.body.user_id) }).toArray();

    // Fetch product details for each cart item
    const cartWithProducts = await Promise.all(cartItems.map(async cartItem => {
      const productId = cartItem.prod_id;
      const product = await ProductModel.findOne({ _id: new mongoose.Types.ObjectId(productId) });
      return { cartItem, product };
    }));

    // Calculate total price and discounted price
    let totalPrice = cartWithProducts.reduce((total, { product }) => total + Number(product.sale_price), 0);
    let discPrice = cartWithProducts.reduce((total, { product }) => total + Number(product.price), 0);


    let oneTimeCode = await generateOneTimeCode(address.zip_code, req.body.user_id);

    // Create order in Razorpay
    const options = {
      amount: ((totalPrice + (cartItems.length * 60)) * 100), // amount in paise
      currency: 'INR',
      receipt: oneTimeCode // you can use your own logic to generate a receipt
    };

    const order = await razorpay.orders.create(options);

    const DateNow = Date.now();

    // Store order details in MongoDB
    const OrderModel = db.get().collection('ORDER');
    const newOrder = {
      user_id: req.body.user_id,
      order_id: order.id,
      amount: (totalPrice + (cartItems.length * 60)),
      address: address,
      products: cartWithProducts.map(({ product }) => product),
      status: 'unpaid',
      timestamp: DateNow,
      date: formatDate(DateNow)
    };
    await OrderModel.insertOne(newOrder);

    console.log(order);

    res.json({ order, newOrder, user });
  } catch (err) {
    console.error("Error creating order:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});


// Verify Payment
router.post('/payment/verify', isAuthorised, async function (req, res, next) {
  try {
    const CartModel = db.get().collection('CART');
    const OrderModel = db.get().collection('ORDER');
    const UserModel = db.get().collection('USER');
    const details = req.body;
    const userExist = await UserModel.findOne({ _id: new mongoose.Types.ObjectId(details['order_details[address][user_id]']) });
    let hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(details['payment_response[razorpay_order_id]'] + '|' + details['payment_response[razorpay_payment_id]']);
    hmac = hmac.digest('hex');
    if (hmac == details['payment_response[razorpay_signature]']) {
      await CartModel.deleteOne({ user_id: new mongoose.Types.ObjectId(details['order_details[address][user_id]']) });
      await OrderModel.updateOne({ order_id: details['order_details[order_id]'] }, { $set: { status: 'paid', payment_id: details['payment_response[razorpay_payment_id]'] } });
      await mail.sendMail({
        from: '"Elegent Purse" <thintryin@gmail.com>',
        to: userExist.email,
        subject: "Order Confirmation",
        text: `Hello ${userExist.first_name},
    
    Thank you for placing an order with Elegent Purse. Your order has been received and is currently being processed.
    
    Order Details:
    - Order Number: ${details['order_details[order_id]']}
    - Total Amount: ${details['order_details[amount]']}
    
    You will receive another email once your order has been shipped. If you have any questions or concerns regarding your order, please feel free to contact us.
    
    Thank you for shopping with Elegent Purse.
    
    Best Regards,
    The Elegent Purse Team`,
        html: `<p>Hello ${userExist.first_name},</p>
    
    <p>Thank you for placing an order with Elegent Purse. Your order has been received and is currently being processed.</p>
    
    <p><strong>Order Details:</strong></p>
    <ul>
        <li><strong>Order Number:</strong> ${details['order_details[order_id]']}</li>
        <li><strong>Total Amount:</strong> ${details['order_details[amount]']}</li>
    </ul>
    
    <p>You will receive another email once your order has been shipped. If you have any questions or concerns regarding your order, please feel free to contact us.</p>
    
    <p>Thank you for shopping with Elegent Purse.</p>
    
    <p>Best Regards,<br/>The Elegent Purse Team</p>`
      });

      await mail.sendMail({
        from: '"Elegant Purse" <thintryin@gmail.com>',
        to: 'elegentpurse@gmail.com', // Replace with the actual admin email address
        subject: 'New Order Received',
        text: `Hello Admin,
      
      A new order has been placed with Elegant Purse. Below are the details of the order:
      
      Order Details:
      - Customer Name: ${userExist.first_name} ${userExist.last_name}
      - Customer Email: ${userExist.email}
      - Order Number: ${details['order_details[order_id]']}
      - Total Amount: ${details['order_details[amount]']}
      - Order Date: ${formatDate(new Date())}
      
      Please process this order at your earliest convenience. If you need any further information, please let us know.
      
      Best Regards,
      The Elegant Purse Team`,
        html: `<p>Hello Admin,</p>
      
      <p>A new order has been placed with Elegant Purse. Below are the details of the order:</p>
      
      <p><strong>Order Details:</strong></p>
      <ul>
        <li><strong>Customer Name:</strong> ${userExist.first_name} ${userExist.last_name}</li>
        <li><strong>Customer Email:</strong> ${userExist.email}</li>
        <li><strong>Order Number:</strong> ${details['order_details[order_id]']}</li>
        <li><strong>Total Amount:</strong> ${details['order_details[amount]']}</li>
        <li><strong>Order Date:</strong> ${formatDate(new Date())}</li>
      </ul>
      
      <p>Please process this order at your earliest convenience. If you need any further information, please let us know.</p>
      
      <p>Best Regards,<br/>The Elegant Purse Team</p>`
      });


      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    console.error("Error verifying payment:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});

router.post('/order/status/change', isAdmin, async function (req, res, next) {
  try {
    const OrderModel = db.get().collection('ORDER');
    const UserModel = db.get().collection('USER');
    const existOrder = await OrderModel.findOne({ order_id: req.body.order_id });
    const userExist = await UserModel.findOne({ _id: new mongoose.Types.ObjectId(existOrder.user_id) });

    let statusMessage = '';
    let subject = '';

    if (req.body.status == 'shipped') {
      await OrderModel.updateOne({ order_id: req.body.order_id }, { $set: { status: 'shipped' } });
      statusMessage = `Your <a href='${'https://elegentpurse.com/user/order/details/' + existOrder.order_id}'>order</a> has been shipped and is on its way to you.`;
      subject = 'Order Shipped';
    } else if (req.body.status == 'delivered') {
      await OrderModel.updateOne({ order_id: req.body.order_id }, { $set: { status: 'delivered' } });
      statusMessage = `Your <a href='${'https://elegentpurse.com/user/order/details/' + existOrder.order_id}'>order</a> has been delivered successfully.`;
      subject = 'Order Delivered';
    } else if (req.body.status == 'cancel') {
      await OrderModel.updateOne({ order_id: req.body.order_id }, { $set: { status: 'canceled' } });
      statusMessage = `Your <a href='${'https://elegentpurse.com/user/order/details/' + existOrder.order_id}'>order</a> has been calcelled successfully.`;
      subject = 'Order Calceled';
    }

    // Send email to notify the user about the status change
    await mail.sendMail({
      from: '"Elegent Purse" <thintryin@gmail.com>',
      to: userExist.email,
      subject: subject,
      text: `Hello ${userExist.first_name},

${statusMessage}

Thank you for shopping with Elegent Purse.

Best Regards,
The Elegent Purse Team`,
      html: `<p>Hello ${userExist.first_name},</p>

<p>${statusMessage}</p>

<p>Thank you for shopping with Elegent Purse.</p>

<p>Best Regards,<br/>The Elegent Purse Team</p>`
    });

    res.redirect('/admin/orders');
  } catch (err) {
    console.error("Error changing order status:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});

router.post('/refund', isAdmin, async function (req, res, next) {
  try {
    const OrderModel = db.get().collection('ORDER');
    const UserModel = db.get().collection('USER');
    const existOrder = await OrderModel.findOne({ order_id: req.body.order_id });
    const userExist = await UserModel.findOne({ _id: new mongoose.Types.ObjectId(existOrder.user_id) });

    if (existOrder && userExist) {
      // Create a base64 encoded string of your key ID and key secret
      const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');

      // Set up the request headers
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      };

      // The data to be sent in the request body
      const data = {
        amount: existOrder.amount * 100
      };

      // The URL for the refund API
      const url = `https://api.razorpay.com/v1/payments/${existOrder.payment_id}/refund`;

      // Make the POST request
      axios.post(url, data, { headers })
        .then(async response => {
          console.log('Refund successful:', response.data);
          await OrderModel.updateOne({ order_id: existOrder.order_id }, { $set: { status: 'canceled', refund: true } });
          // Send email to notify the user about the status change
          await mail.sendMail({
            from: '"Elegant Purse" <thintryin@gmail.com>',
            to: userExist.email,
            subject: 'Your Order Refund has been Processed',
            text: `Hello ${userExist.first_name},

We wanted to let you know that your order refund has been successfully processed.

If you have any questions or need further assistance, please feel free to reach out to our support team.

Thank you for choosing Elegant Purse.

Best regards,
The Elegant Purse Team`,
            html: `<p>Hello ${userExist.first_name},</p>

<p>We wanted to let you know that your order refund has been successfully processed.</p>

<p>If you have any questions or need further assistance, please feel free to reach out to our support team.</p>

<p>Thank you for choosing Elegant Purse.</p>

<p>Best regards,<br/>The Elegant Purse Team</p>`
          });

          res.redirect('/admin/orders')

        })
        .catch(async error => {
          console.error('Error processing refund:', error);

          // Send an error notification email to the user
          await mail.sendMail({
            from: '"Elegant Purse" <thintryin@gmail.com>',
            to: userExist.email,
            subject: 'Issue with Your Order Refund',
            text: `Hello ${userExist.first_name},

We encountered an issue while processing your order refund.

Our team is working to resolve this as quickly as possible. We apologize for any inconvenience caused and appreciate your patience.

If you have any questions or need further assistance, please feel free to reach out to our support team.

Thank you for choosing Elegant Purse.

Best regards,
The Elegant Purse Team`,
            html: `<p>Hello ${userExist.first_name},</p>

<p>We encountered an issue while processing your order refund.</p>

<p>Our team is working to resolve this as quickly as possible. We apologize for any inconvenience caused and appreciate your patience.</p>

<p>If you have any questions or need further assistance, please feel free to reach out to our support team.</p>

<p>Thank you for choosing Elegant Purse.</p>

<p>Best regards,<br/>The Elegant Purse Team</p>`
          });
        });
      res.redirect('/admin/orders')
    }
  } catch (err) {
    console.error("Error changing order status:", err);
    res.render('error', {
      title: '500 - Elegent Purse',
      description: "Don't worry, check out our latest arrivals or explore our collection by category.",
      status: 500,
      error: {
        message: "Server Error!"
      },
      message: "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience."
    });
  }
});
module.exports = router;
