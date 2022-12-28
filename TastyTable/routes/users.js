const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
var multer = require('multer');
const fs = require("fs");
// Load User model
const User = require('../models/User');
const { forwardAuthenticated } = require('../config/auth');
const {check} = require('express-validator');
const Password = require('../config/password-recovery');
var LocalStorage = require('node-localstorage').LocalStorage,
localStorage = new LocalStorage('./scratch');

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
})

var upload = multer({ storage: storage })


// Login Page
router.get('/login', forwardAuthenticated, (req, res) => res.render('login'));

// Register Page
router.get('/register', forwardAuthenticated, (req, res) => res.render('register'));

// Register
router.post('/register', (req, res) => {
  const { name, email, password, password2 } = req.body;
  let errors = [];

  //check required fields
  if (!name || !email || !password || !password2) {
    errors.push({ msg: 'Please enter all fields' });
  }

//check passwords match
  if (password != password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  //check password length
  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.render('register', {
      errors,
      name,
      email,
      password,
      password2
    });
  } else {
    User.findOne({ email: email }).then(user => {
      if (user) {
        errors.push({ msg: 'Email already exists' });
        res.render('register', {
          errors,
          name,
          email,
          password,
          password2
        });
      } else {
        const newUser = new User({
          name,
          email,
          password
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            console.log(newUser);
            console.log('NEW USER PASSWORD: ', newUser.password);
            newUser
              .save()
              .then(user => {
                req.flash(
                  'success_msg',
                  'You are now registered and can log in'
                );
                res.redirect('/users/login');
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
  }
});

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true
  })(req, res, next);
});

// Logout
router.get('/logout', (req, res, next) => {
  localStorage.clear();
  try {
    fs.unlink('../public/image.jpg');
  } catch {
    console.log('file not exists');  
  }
  req.logout(function(err){
    if(err) { return next(err); }
    req.flash('success_msg', 'You are logged out');
    res.redirect('/users/login');
  });
});

router.post('/upload', upload.single('myImage'), (req, res, next) => {
  console.log('req: ', req);
  // console.log("image: ", req.user.photos);
  var img = fs.readFileSync(req.file.path);
    var encode_img = img.toString('base64');
    var email = localStorage.getItem('email');
    // console.log('get email: ', email);
    var query = { email: email };
    var final_img = {
      $set: {
        profileImage: Buffer.from(encode_img,'base64')
      }
    };
    const options = { upsert: true };
    User.updateOne(query, final_img, options, function(err,result){
        if(err){
            console.log(err);
        }else{
            // console.log(result.img.Buffer);
            console.log("Saved To database");
            // res.contentType(final_img.contentType);
            // res.send(final_img.profileImage);
            res.render('user', {
              user: req.user
            });
        }
    })
});


//Password RESET
router.get('/recover-password', (req,res) => {
  res.render('recover-password');
})

router.post('/recover', [
  check('email').isEmail().withMessage('Enter a valid email address'),
], Password.recover);

router.get('/reset/:token', Password.reset);

router.post('/reset/:token', [
  check('password').not().isEmpty().isLength({min: 6}).withMessage('Must be at least 6 chars long'),
  check('confirmPassword', 'Passwords do not match').custom((value, {req}) => (value === req.body.password)),
], Password.resetPassword);

module.exports = router;
