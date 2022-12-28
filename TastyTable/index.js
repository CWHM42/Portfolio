// TastyTable App
const express = require('express');
const bodyParser = require("body-parser");
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const port = process.env.PORT || 3000;

const app = express();

// Passport Config
require('./config/passport')(passport);

// DB Config
const db = require('./config/keys').mongoURI;

/* // Connect to MongoDB
mongoose
  .connect(
    db,
    { useNewUrlParser: true ,useUnifiedTopology: true}
  )
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err)); */

//connect to MongoDB
require("./connections/mongoconnections");
// New code needed because of mongo deprication
mongoose.set('strictQuery', true);

// Express session
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');

// Connect flash
app.use(flash());

// Global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// To use styles.css file
app.use(express.static('public'));

/*  Google AUTH  */
 
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const GOOGLE_CLIENT_ID = '352521170157-tca21eehk3n87tjudhddmso3nnsv79di.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback",
    passReqToCallback: true
  },
  function(request, accessToken, refreshToken, profile, done) {
      userProfile=profile;
      return done(null, userProfile);
  }
));

 
app.get('/auth/google', 
  passport.authenticate('google', { scope : ['profile', 'email'] }));
 
app.get('/auth/google/callback', 
  passport.authenticate('google', { 
    successRedirect: '/dashboard',
    failureRedirect: '/login' 
  }));

// Express body parser
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded(
  { extended:true }
));

// Ejs for the template
// app.set('view engine', 'ejs');

// ROUTE HANDLERS (routes/index.js)

app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));


app.get('/', (req, res)=>{
    res.redirect('/home')
});

// Listener
app.listen(port, ()=> console.log(`App listening on port ${port}`));