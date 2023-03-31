if(process.env.NODE_ENV !== "production"){
    require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
mongoose.set('strictQuery', false);
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const Joi = require("joi")//for server side validation
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user")
const Campground = require("./models/campground");
const catchAsync = require("./utils/catchAsync");
const ExpressError = require("./utils/expressError");
const {campgroundSchema, reviewSchema} = require("./joiSchemas");//Joi schema
const Review = require("./models/review");
const app = express();
const path = require("path");
const {cloudinary} = require("./cloudinary")
//multer
const multer = require("multer");
const {storage} = require("./cloudinary");
const upload = multer({storage});

// //Mongo for Session Store (udemy: section59:574) (npm i connect mongo)
// const MongoDBStore= require("connect-mongo");

//Second, we connect DB
const DB = process.env.DB_URL;
mongoose.connect(DB,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(con => {
    console.log("DB connection seccessful");
}).catch(e=>{
    console.log(e);
})

//1) First, we set views template engine
app.engine("ejs", ejsMate);// for layouts and partials
/*i.*/app.set("view engine", "ejs");
/*ii.*/app.set("views", path.join(__dirname, "views"));

//***app.use are the middleware that run on every single request***
//2) Second, urlencoded to parse req.body
app.use(express.urlencoded({extended: true}));

//3) Third, use method-override
app.use(methodOverride("_method"));

//4) Fourth, middlwware to use public folder
app.use(express.static(path.join(__dirname, "public")));

//5) Fifth, express session npm i express-session
const sessionConfig = {
    name: "session",
    secret: "thisshouldbeabettersecret",
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,     /* ms    s    min  hr  days*/ 
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig));

//6) Sixth, connect-flash npm i connect-flash
app.use(flash());
app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currentUser = req.session.user || null;
    next();
})

//7) Seventh, passport configuration [this should be written always after "app.use(session())]"
app.use(passport.initialize());
app.use(passport.session());
// passport.use(new LocalStrategy(User.authenticate()));
// passport.serializeUser(User.serializeUser());//storing in session
// passport.deserializeUser(User.deserializeUser());//unstoring in session

const joiValidateCampground = (req,res,next) =>{
    const {error} = campgroundSchema.validate(req.body);
    if(error){
        const msg = error.details.map(el => el.message).join(",");
        throw new ExpressError(msg, 400);
    }else{
        next();
    }
}

const joiValidateReview = (req,res, next)=>{
    const {error} = reviewSchema.validate(req.body);
    if(error){
        const msg = error.details.map(el => el.message).join(",");
        throw new ExpressError(msg, 400);
    }else{
        next();
    }
}

const isLoggedIn = (req,res, next)=>{
    if(!req.session.user){
        req.session.returnTo = req.originalUrl;
        req.flash("error", "You must be signed in first");
        return res.redirect("/login");
    }
    next();
}

app.get("/", (req,res)=>{
    res.render("home")
});

app.get("/register", (req,res)=>{
    res.render("users/register");
})

app.post("/register",async(req,res)=>{
    try{
        const user = await User.create(req.body)
        req.session.user = user;
        req.flash("success", "Welcome to yelp camp");
        res.redirect("/campgrounds");
    }catch(err){
        req.flash("error", err.message);
        res.redirect("/register");
    }
});

app.get("/login", (req,res)=>{
    res.render("users/login");
});

app.post("/login", async (req,res)=>{
    const {username, password} = req.body;
    const user = await User.findOne({username});
    if(password === user.password){
        req.session.user = user;
        req.flash("success", "Welcome back");
        const redirectUrl = req.session.returnTo || "/campgrounds";
        delete req.session.returnTo;
        res.redirect(redirectUrl);
    }else{
        req.flash("error", "Username or Password incorrect");
        res.redirect("/login");
    }
});

app.get("/logout", (req,res)=>{
    req.logout(function(err){
        if(err) return next(err);
        req.flash("success", "Logged Out!");
        res.redirect("/campgrounds");
    })
})

app.get("/campgrounds",catchAsync(async(req,res)=>{
    const campgrounds = await Campground.find();
    res.render("campgrounds/index",{
        campgrounds
    });
}));

app.get("/campgrounds/new",isLoggedIn, (req,res)=>{
    res.render("campgrounds/new");
});

app.post("/campgrounds",isLoggedIn, upload.array("image"), joiValidateCampground, catchAsync(async (req,res, next)=>{
    const campground = new Campground(req.body);
    console.log(req.files);
    const files = req.files;
    campground.images = files.map(f => ({url: f.path, filename: f.filename}));
    // campground.images =  {url: file.path, filename: file.filename}
    campground.author = req.session.user._id;
    await campground.save();
    console.log("*/*/*/*/*/*/",campground);
    req.flash("success", "Campground Created")
    res.redirect(`/campgrounds/${campground._id}`);

    //instead for writing try catch blocks, we wrap this async function around catchAsync function
    // try{   
    //     const campground = await Campground.create(req.body);
    //     res.redirect(`/campgrounds/${campground._id}`);
    // }catch(e){
    //     //res.send("Something went wrong"); or
    //     next(e);// this hits (if error) at the last app.use error middleware
    // }
}))

app.get("/campgrounds/:id",catchAsync(async(req,res)=>{
    const id = req.params.id;
    // const campground = await Campground.findById(id).populate("reviews").populate("author"); populating reviews
    const campground = await Campground.findById(id).populate({ // populating reviews and its individual author
        path: "reviews",
        populate: {
            path: "author"
        }
    }).populate("author");
    if(!campground) {
        req.flash("error", "Cannot find that Campground");
        return res.redirect("/campgrounds");
    }
    res.render("campgrounds/show",{
        campground
    })
}));

app.get("/campgrounds/:id/edit",isLoggedIn,catchAsync(async(req,res)=>{
    const {id} = req.params;
    const campground = await Campground.findById(id).populate("author");
    if(!campground){
        req.flash("error", "Cannot find that Campground");
        return res.redirect("/campgrounds")
    }
    if(campground.author.username !== req.session.user.username){
        req.flash("error", "You dont have permission to do that");
        return res.redirect(`/campgrounds/${id}`);
    }
    res.render("campgrounds/edit", {
        campground
    })
}));

app.put("/campgrounds/:id",isLoggedIn, upload.array("image"),joiValidateCampground, catchAsync(async(req,res)=>{
    const {id} = req.params;
    const campground = await Campground.findById(id).populate("author");
    // console.log("-*-*-*-*",campground, req.session)
    if(campground.author.username === req.session.user.username){
        const campground = await Campground.findByIdAndUpdate(id, req.body);
        const imgs = req.files.map(f => ({ url: f.path, filename: f.filename}))
        campground.images.push(...imgs);
        if(req.body.deleteImages){
            for(let filename of req.body.deleteImages){
                await cloudinary.uploader.destroy(filename);//to delete from cloudinary
            }
            await campground.updateOne({$pull: {images: {filename: {$in: req.body.deleteImages}}}})//to delete from mongoDB
        }
        await campground.save();
        req.flash("success", "Campground Updated")
        res.redirect(`/campgrounds/${campground._id}`);
    }else{
        req.flash("error","You donot have permission to do that");
        res.redirect(`/campgrounds/${id}`)
    }
}));

app.delete("/campgrounds/:id",isLoggedIn,catchAsync(async(req,res)=>{
    const {id} = req.params;
    const campground = await Campground.findById(id).populate("author");
    if(campground.author.username === req.session.user.username){
        await Campground.findByIdAndDelete(id);
        req.flash("success", "Campground Deleted");
        res.redirect("/campgrounds");
    }else{
        req.flash("error","You donot have permission to do that");
        res.redirect(`/campgrounds/${id}`)
    }
}));

app.post("/campgrounds/:id/reviews",isLoggedIn, joiValidateReview, catchAsync(async (req,res)=>{
    const {id} = req.params;
    const campground = await Campground.findById(id);
    const review = new Review(req.body);
    review.author = req.session.user._id;
    campground.reviews.push(review);
    await campground.save();
    await review.save();
    req.flash("success", "Created new review");
    res.redirect(`/campgrounds/${campground._id}`);
}));

app.delete("/campgrounds/:id/reviews/:reviewId", isLoggedIn, catchAsync(async (req,res)=>{
    const {id, reviewId} = req.params;
    const review = await Review.findById(reviewId).populate("author");
    if(review.author.username === req.session.user.username){
        await Campground.findByIdAndUpdate(id, {$pull: {reviews: reviewId}});
        await Review.findByIdAndDelete(reviewId);
        req.flash("success", "Review Deleted");
        res.redirect(`/campgrounds/${id}`)
    }else{
        req.flash("error", "You dont have permission to do that");
        res.redirect(`/campgrounds/${id}`)
    }
}))

app.all("*", (req,res,next) =>{
    next(new ExpressError("Page Not Found", 404));
})

app.use((err,req,res,next) =>{
    const {statusCode = 500} = err;
    if(!err.message) err.message = "Oh No, Something went wrong";
    res.status(statusCode).render("errors",{err});
})

app.listen(3000, ()=>{
    console.log("Listening on PORT 3000...");
})