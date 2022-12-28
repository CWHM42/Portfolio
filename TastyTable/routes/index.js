const express = require('express');
const app = express();
const router = express.Router();
const request = require('request');
const { default: mongoose } = require('mongoose');
const fs = require('fs');
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const User = require('../models/User');

app.use(express.json()) // send as JSON
app.use(express.urlencoded({extended: false})) // send as URL encoded

var LocalStorage = require('node-localstorage').LocalStorage,
localStorage = new LocalStorage('./scratch');

// depreciated mongo 
mongoose.set('strictQuery', false);

// Spoonacular Required Info:
const options = {
  method: 'GET',
  url: '',
  qs: {},
  headers: {
      'X-RapidAPI-Key': 'b53f7d209fmshf9245a521caa7e4p14d38fjsnac9b97377cab',
      'X-RapidAPI-Host': 'spoonacular-recipe-food-nutrition-v1.p.rapidapi.com',
      useQueryString: true
  }
};

const baseUrl = "https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes";

// Welcome Page
router.get('/', forwardAuthenticated, (req, res) => res.render('welcome'));

// user
router.get("/user", ensureAuthenticated, async (req, res) => {
  res.render('user.ejs', {
    user: req.user
  });
});

// Dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  // console.log("Req: ", req.user);
  let email = null;
  all_keys = Object.keys(req.user);
  let profileImage = null;
  let name = null;
  // console.log('ALL KEYS:', all_keys);
  if(all_keys.includes("displayName")){
    email = req.user.emails[0]['value'];
    // console.log("EMAIL: ", email);
    User.findOne({email: email})
      .then(item => {
      console.log('item: ', item);
      if(item && item.profileImage){
        profileImage = item.profileImage;
        name = item.displayName;
      }
    });
    // console.log('USER: ', userDetails);
  } else {
    if(req.user.profileImage){
      profileImage = Buffer.from(req.user.profileImage, 'base64');
    }
    email = req.user.email;
  }
  // console.log('email: ', email);
  store_email = localStorage.getItem("email");
  localStorage.setItem("email", email);
  if(profileImage){
    fs.writeFileSync('./public/image.jpg', profileImage);
  }

  const endpoint = `${baseUrl}/random`;
  options.url = endpoint;
  options.qs.tags = 'dinner';
  options.qs.number = '20';

  request(options, function (error, response, body){
      if (!error && response.statusCode === 200){
          let data = JSON.parse(body);
          let recipes = data.recipes;
          res.render('dashboard', {user: req.user, recipeInfo: recipes});
      } else {
          res.render('error');
      }
  });
});

// About Page
router.get('/about', ensureAuthenticated, (req,res) =>
  res.render('about', {
    user: req.user
  })
);

// Search Results Page
router.get("/getSearchResults", ensureAuthenticated, async (req, res) => {
  let searchQuery = req.query.searchQuery // We use req.query.searchQuery to grab the search keyword(s) entered by user
  const endpoint = `${baseUrl}/search`;
  options.url = endpoint;
  options.qs.query = `${searchQuery}`;
  options.qs.number = '20';

  request(options, function (error, response, body){
    if (!error && response.statusCode === 200){
      let data = JSON.parse(body);
      let recipes = data.results;
      //console.log(data.results);  
      res.render('results', {user: req.user, data: data, recipeInfo: recipes, searchQuery: searchQuery}); 
    } else {
      res.render('error');
    }   
    });
});

// Save a recipe to favorites
router.get('/addToFavs', ensureAuthenticated, (req, res) =>{
  let recipeID = req.query.id  // Upon button click, assign recipe id value to recipeID
  const endpoint = `${baseUrl}/${recipeID}/information`;
  options.url = endpoint;
  req.id = recipeID;

  request(options, (error, response, body)=>{
    if(!error && response.statusCode === 200){
      let data = JSON.parse(body);
      let favData = {
        id: data.id.toString(),
        title: data.title,
        image: data.image,
        Url: data.sourceUrl  
      };
      //console.log(data.id)

      User.updateOne({name: req.user.name}, {$push:{favoriteRecipe: favData}}, {upsert: true}, (err, result) => {
        if(err) {
            console.log(err)
            res.status(400).json({message: "Unable to send recipe to the database"});
        } else {
            // receipt
            console.log(result);
            //res.json(result);
        }
      }); 
      // console.log("Data from /favorites is: ", id);
      } else {
          res.render(err, 'error');
      }   
    });
    res.redirect('/favorites')
});

// View saved favorite recipes
router.get('/favorites', ensureAuthenticated, (req, res) =>{

  User.find({email: req.user.email}, {favoriteRecipe: 1, _id: 0}, (err, results) => {
    if(err){
        console.log(err)
        res.status(400).json({message: "Cannot retrieve favorites from the db"})
    } else {
        //res.json(results)
        rArray = results[0].favoriteRecipe;
        res.render('favorites', {user: req.user, 'results': rArray});
    }
});
});

// Delete from favorites
router.get('/delete/:id', ensureAuthenticated, (req, res) =>{
  let recipeID = req.query.id;
  //console.log(recipeID);
  User.updateOne({email: req.user.email}, {$pull: {favoriteRecipe: {id: recipeID} }}, (err, results) => {
    if(err){
      console.log(err)
      res.status(400).json({message: "Cannot delete requested recipe from the db"})
    } else {
      //rArray = results[0].favoriteRecipe;
      res.redirect('/favorites');
      //res.json(results)
    }
  });
 });

// Recipe Page
router.get("/getRecipe", ensureAuthenticated, async (req, res) => {
  let recipeID = req.query.id  // Upon button click, assign recipe id value to recipeID
  const endpoint = `${baseUrl}/${recipeID}/information`;
  options.url = endpoint;

  request(options, (error, response, body)=>{
    if(!error && response.statusCode === 200){
      let data = JSON.parse(body);
      //console.log("Data from /addToFavs is: ", data);
      const endpoint2 = `${baseUrl}/${recipeID}/nutritionWidget.json`;
      options.url = endpoint2;

        // Nested request
        request (options, (error, response, body)=>{
          if(!error && response.statusCode === 200){
            let data2 = JSON.parse(body); 
            res.render('recipePage', {user: req.user, RecipeInfo: data, nutriInfo: data2}); 
          } else {
            res.render('error');
          }
        })   
    } else {
        res.render('error');
    }   
  }); 
});

module.exports = router;
