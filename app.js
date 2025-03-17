if(process.env.NODE_ENV !== "production"){
  require("dotenv").config();
}
  
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");


const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const review = require('./models/review.js');

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

// const MONGO_URL = 'mongodb://localhost:27017/wanderlust';
const dbUrl = process.env.ATLASDB_URL;
async function main(){
    try{
        await mongoose.connect(dbUrl);
    }catch(err){
        console.error(err);
    }
}

main()
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error(err));


//main test route
// app.get('/', (req, res) => {
//     res.send('Hello World');
// });

const store = MongoStore.create({
  mongoUrl: dbUrl,
  touchAfter: 24 * 3600,
  crypto: {
    secret: process.env.SECRET
  }
});

store.on("error", ()=> {
  console.log("Error in Mongo Session Store", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
};


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => { //directly cant access req.user in ejs
  res.locals.currUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

app.get("/demoUser", async (req, res)=>{
  let fakeUser = new User({
    email: "student@gmail.com",
    username: "delta-student"
  });

  let registeredUser = await User.register(fakeUser, "helloworld");
  res.send(registeredUser);
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

app.all("*", (req, res, next)=>{
  next( new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
  let {statusCode=505, message="Something went wrong"} = err;
  res.status(statusCode).render("error.ejs", {message});
  // res.status(statusCode).send(message);
  
});

// for testing route
// app.get("/testListing", async (req, res) => {
//   let sampleListing = new Listing({
//     title: "My New Villa",
//     description: "By the beach",
//     price: 1200,
//     location: "Calangute, Goa",
//     country: "India",
//   });

//   await sampleListing.save();
//   console.log("sample was saved");
//   res.send("successful testing");
// });

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});