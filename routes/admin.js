var express = require('express');
var router = express.Router();
let db = require('../db/config');
const { default: mongoose } = require('mongoose');
let fs = require('fs');

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


/* GET users listing. */
router.get('/product', isAdmin, async function (req, res, next) {
  try {
    const prodCollection = db.get().collection('PRODUCT');
    const products = await prodCollection.find().toArray();
    res.render('admin/product', { title: 'Product - Elegent Purse', admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false, auth: true, auth: true, products })
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

// GET Category Page
router.get('/category', isAdmin, async function (req, res, next) {
  try {
    const catCollection = db.get().collection('CATEGORY');
    const categories = await catCollection.find().toArray();
    console.log(categories);
    res.render('admin/category', { title: 'Category - Elegent Purse', admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false, auth: true, categories })
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

// GET Add Category Page
router.get('/category/edit/:catId', isAdmin, async function (req, res, next) {
  try {
    const catCollection = db.get().collection('CATEGORY');
    const category = await catCollection.findOne({ _id: new mongoose.Types.ObjectId(req.params.catId) });
    res.render('admin/editcategory', { title: 'Edit Category - Elegent Purse', admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false, auth: true, category })
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

// GET Refund Page
router.get('/refund/:orderId', isAdmin, async function (req, res, next) {
  try {
    const OrderModel = db.get().collection('ORDER');
    let order = await OrderModel.findOne({ order_id: req.params.orderId });
    res.render('admin/refund', { title: 'Refund - Elegent Purse', admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false, auth: true, order })
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

// GET Add Category Page
router.get('/category/add', isAdmin, function (req, res, next) {
  try {
    res.render('admin/addcategory', { title: 'Add Category - Elegent Purse', admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false, auth: true })
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

// GET Add Product Page
router.get('/product/add', isAdmin, async function (req, res, next) {
  try {
    const catCollection = db.get().collection('CATEGORY');
    const categories = await catCollection.find().toArray();
    console.log(categories);
    res.render('admin/addproduct', { title: 'Add Product - Elegent Purse', admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false, auth: true, categories })
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

// GET Edit Product Page
router.get('/product/edit/:prodId', isAdmin, async function (req, res, next) {
  try {
    const prodCollection = db.get().collection('PRODUCT');
    const product = await prodCollection.findOne({ _id: new mongoose.Types.ObjectId(req.params.prodId) });

    res.render('admin/editproduct', { title: 'Edit Product - Elegent Purse', admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false, auth: true, product })
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

router.get('/orders', isAdmin, async function (req, res, next) {
  try {
    const orderCollection = db.get().collection('ORDER');
    const orders = await orderCollection.find().sort({ timestamp: -1 }).toArray(); // Sort by lastModified date in descending order
    res.render('admin/orders', { title: 'Orders - Elegent Purse', admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false, auth: true, orders });
  } catch (err) {
    console.error("Error retrieving orders:", err);
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



// GET Customers Page
router.get('/customers', isAdmin, async function (req, res, next) {
  try {
    const userCollection = db.get().collection('USER');
    const users = await userCollection.find().toArray();
    res.render('admin/customers', { title: 'Customers - Elegent Purse', admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false, auth: true, users })
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

// GET Banner Page
router.get('/banner', isAdmin, async function (req, res, next) {
  try {
    const bannCollection = db.get().collection('BANNER');
    const banners = await bannCollection.find().toArray();
    res.render('admin/banner', { title: 'Banners - Elegent Purse', admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false, auth: true, banners })
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

// GET Add Banner Page
router.get('/banner/add', isAdmin, async function (req, res, next) {
  try {
    res.render('admin/addbanner', { title: 'Add Banner - Elegent Purse', admin: req.session.user ? req.session.user.admin : false, user: req.session.user ? req.session.user : false, auth: true })
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

// GET Edit Banner Page
router.get('/banner/delete/:bannerId', isAdmin, async function (req, res, next) {
  try {
    const bannCollection = db.get().collection('BANNER');
    const banner = await bannCollection.findOne({ _id: new mongoose.Types.ObjectId(req.params.bannerId) });
    bannCollection.deleteOne({ _id: banner._id });
    fs.unlink('./public/images/' + banner._id + '.jpeg', function (err) {
      if (err) throw err;
      res.redirect('/admin/banner');
    });
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
