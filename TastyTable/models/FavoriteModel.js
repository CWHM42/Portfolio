const mongoose = require("mongoose");
// package that validates url for mongoose
require('mongoose-type-url');

// Schema - Structure for our data in the Favorites collection
// Goal is to save recipes in collection for the user
const favoriteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: 'Title can\'t be empty'
    },
    sourceUrl: {
        type: String,
        required: 'URL can\'t be empty'
    },
    image: {
        //data: buffer,
        contentType: String
    },
    instructions: {
        type: String,
        required: 'Intructions can\'t be empty'
    }
});

/* userSchema.path('downloadURL').validate((val) => {
    urlRegex = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
    return urlRegex.test(val);
}, 'Invalid URL.'); */

// Model - define our collection and specify which schema to use
exports.favoriteModel = new mongoose.model("favorites", favoriteSchema);