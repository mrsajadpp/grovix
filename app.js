var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let handlebars = require('express-handlebars');
let session = require('express-session');
let cookieSession = require('cookie-session');
let fileUpload = require('express-fileupload');
let favicon = require("serve-favicon");
const compression = require("compression");
const connectDB = require('./db');

var app = express();

// Function to connect to the database
connectDB();

var hbs = handlebars.create({});

var postRouter = require('./routes/post');
var indexRouter = require('./routes/index');
var adminRouter = require('./routes/admin');
var authRouter = require('./routes/dashboard');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.use(favicon(path.join(__dirname, 'public', '/icons/favicon.ico')));
app.engine('hbs', handlebars.engine({
  extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layouts/', partialsDir: __dirname + '/views/partials/', helpers: {
    ifequal: function (arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    },
    formatNumber: (number) => {
      const units = ['K', 'M', 'B', 'T', 'P', 'E'];
      let unit = '';
      let num = number;

      for (let i = units.length - 1; i >= 0; i--) {
        const size = Math.pow(1000, i + 1);
        if (number >= size) {
          num = number / size;
          unit = units[i];
          break;
        }
      }

      return num.toFixed(1).replace(/\.0$/, '') + unit;
    },
    formatDate: function (dateString) {
      const date = new Date(dateString);
      const options = { weekday: 'short', month: 'short', year: 'numeric' };
      const formattedDate = date.toLocaleDateString('en-US', options);

      const [weekday, month, year] = formattedDate.split(' ');
      return `${weekday}, ${month} ${year}`;
    }
  }
}));

// app.use(session({ secret: "@tricbskt@#]$" }));
app.use(cookieSession({
  name: 'session',
  keys: ["@tricbgrvx@#{$"],
  maxAge: 30 * 24 * 60 * 60 * 1000
}))
app.set('view engine', 'hbs');


// app.use(compression());
app.use(compression({ level: 9 }));
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', postRouter);
app.use('/', indexRouter);
app.use('/admin', adminRouter);
app.use('/dashboard', authRouter)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', { title: err.status, description: "Don't worry, check out our latest arrivals or explore our collection by category.", status: err.status, message: err.status == 404 ? "Sorry but the page you are looking for does not exist, have been removed, name changed, or is temporarily unavailable." : "Something went wrong on our end. Please try again later. Our team has been notified and is working to fix the issue. Thank you for your patience." });
});

module.exports = app;
