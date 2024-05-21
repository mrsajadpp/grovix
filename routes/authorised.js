var express = require('express');
let db = require('../db/config');
const { default: mongoose } = require('mongoose');

var router = express.Router();

const isAuthorised = (req, res, next) => {
  try {
    const userCollection = db.get().collection('USER');
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


// GET Cart Page
router.get('/cart', isAuthorised, async function (req, res, next) {
  try {
    const CartModel = db.get().collection('CART');
    const ProductModel = db.get().collection('PRODUCT');

    const addCollection = db.get().collection('ADDRESS');
    const adressExist = await addCollection.findOne({ user_id: new mongoose.Types.ObjectId(req.session.user._id) });

    // Find cart items for the current user
    const cartItems = await CartModel.find({ user_id: new mongoose.Types.ObjectId(req.session.user._id) }).toArray();

    // Array to store product details for wishlist items
    const cartWithProducts = [];

    // Fetch product details for each wishlist item
    for (const cartItem of cartItems) {
      const productId = cartItem.prod_id;

      // Fetch product details from PRODUCT collection based on product ID
      const product = await ProductModel.findOne({ _id: new mongoose.Types.ObjectId(productId) });

      // Add product details to wishlist item
      cartWithProducts.push({
        cartItem: cartItem,
        product: product
      });
    }

    // Calculate total price
    let totalPrice = await cartWithProducts.reduce((total, { cartItem, product }) => {
      return total + Number(product.sale_price);
    }, 0);

    let discPrice = await cartWithProducts.reduce((total, { cartItem, product }) => {
      return total + Number(product.price);
    }, 0);

    console.log(cartWithProducts);


    res.render('user/cart', {
      title: 'Cart - Elegent Purse',
      admin: req.session.user ? req.session.user.admin : false,
      user: req.session.user ? req.session.user : false,
      cartItems: cartWithProducts,
      totalPrice: totalPrice,
      address: adressExist,
      discPrice,
      discount: (totalPrice - discPrice),
      total: (totalPrice + (cartItems.length * 60)),
      delivery: (cartItems.length * 60)
    });
  } catch (err) {
    console.error("Error retrieving cart items:", err);
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



// GET Cart Page
router.get('/wishlist', isAuthorised, async function (req, res, next) {
  try {
    const wishCollection = db.get().collection('WISHLIST');
    const prodCollection = db.get().collection('PRODUCT');

    // Find wishlist items for the current user
    const wishItems = await wishCollection.find({ user_id: new mongoose.Types.ObjectId(req.session.user._id) }).toArray();

    // Array to store product details for wishlist items
    const wishlistWithProducts = [];

    // Fetch product details for each wishlist item
    for (const wishItem of wishItems) {
      const productId = wishItem.prod_id;

      // Fetch product details from PRODUCT collection based on product ID
      const product = await prodCollection.findOne({ _id: new mongoose.Types.ObjectId(productId) });

      // Add product details to wishlist item
      wishlistWithProducts.push({
        wishlistItem: wishItem,
        product: product
      });
    }

    res.render('user/wishlist', {
      title: 'Wishlist - Elegent Purse',
      admin: req.session.user ? req.session.user.admin : false,
      user: req.session.user ? req.session.user : false,
      wishItems: wishlistWithProducts
    });
  } catch (err) {
    console.error("Error retrieving wishlist:", err);
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


// GET Orders Page
router.get('/orders', isAuthorised, async function (req, res, next) {
  try {
    const orderCollection = db.get().collection('ORDER');
    const prodCollection = db.get().collection('PRODUCT');

    // Find wishlist items for the current user
    const orderItems = await orderCollection.find({ user_id: req.session.user._id }).toArray();

    res.render('user/order', {
      title: 'Orders - Elegent Purse',
      admin: req.session.user ? req.session.user.admin : false,
      user: req.session.user ? req.session.user : false,
      orders: orderItems
    });
  } catch (err) {
    console.error("Error retrieving wishlist:", err);
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

// GET Orders Page
router.get('/order/details/:orderId', isAuthorised, async function (req, res, next) {
  try {
    const orderCollection = db.get().collection('ORDER');
    const prodCollection = db.get().collection('PRODUCT');

    // Find wishlist items for the current user
    const orderItems = await orderCollection.findOne({ order_id: req.params.orderId });

    const date = formatDate(parseInt(orderItems.timestamp));
    const shipDate = addOneDay(parseInt(orderItems.timestamp));

    res.render('user/order_details', {
      title: 'Orders Details - Elegent Purse',
      admin: req.session.user ? req.session.user.admin : false,
      user: req.session.user ? req.session.user : false,
      orders: orderItems,
      date,
      shipDate
    });
  } catch (err) {
    console.error("Error retrieving wishlist:", err);
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


// GET Profile Page
router.get('/profile', isAuthorised, async function (req, res, next) {
  try {
    const userCollection = db.get().collection('USER');
    const addCollection = db.get().collection('ADDRESS');
    const userExist = await userCollection.findOne({ email: req.session.user.email, status: true });
    const adressExist = await addCollection.findOne({ user_id: userExist._id });
    res.render('user/profile', { title: 'Profile - Elegent Purse', user: userExist, address: adressExist, admin: req.session.user ? req.session.user.admin : false })
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


// GET Edit Profile Page
router.get('/profile/edit', isAuthorised, async function (req, res, next) {
  try {
    const userCollection = db.get().collection('USER');
    const addCollection = db.get().collection('ADDRESS');
    const userExist = await userCollection.findOne({ email: req.session.user.email, status: true });
    const adressExist = await addCollection.findOne({ user_id: userExist._id });
    res.render('user/editprofile', { title: 'Edit Profile - Elegent Purse', admin: req.session.user ? req.session.user.admin : false, user: userExist, address: adressExist })
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


// GET Profile Page
router.get('/checkout', isAuthorised, async function (req, res, next) {
  try {
    res.render('user/checkout', { title: 'Checkout - Elegent Purse', admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false })
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
router.get('/auth/address', isAuthorised, async function (req, res, next) {
  try {
    res.render('user/signup_two', { title: 'Address - Elegent Purse', auth: true, admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false })
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

// GET Logout Url
router.get('/logout', isAuthorised, async function (req, res, next) {
  try {
    req.session = null;
    res.redirect('/auth/login');
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

module.exports = router;