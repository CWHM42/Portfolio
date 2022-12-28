require('dotenv').config();
const mongoose = require('mongoose');
const {DB, URI} = process.env; // from the .env file
const endpoint = `mongodb+srv://${URI}/${DB}`; // constructs endpoint with dyaminc URI and DB (In case we are connecting to multiple DBs)

// create an object with authentication credentials
const connectionObject = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    authSource: "admin", 
    user: "HPosch",
    pass: "bootcamp2022",
};

mongoose.connect(endpoint, connectionObject)
.then(()=> console.log(`Connected to ${DB} database`))
.catch(()=>{
    console.log(`Error connecting to ${DB}`, error)
});