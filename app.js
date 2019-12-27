//Author: Ali Al-Karam

//========
//Initial Setup
//========

//Imports and Setup
var express = require('express');
var mongoose = require('mongoose');
var app = express();
var bodyParser = require('body-parser');
var passport = require("passport");
var LocalStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var session = require('express-session');
var mongoStore = require('connect-mongo')(session);
var methodOverride = require("method-override");
var flash = require('connect-flash');

//Configuration
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("resources"));
app.engine('html', require('ejs').renderFile);
mongoose.set('useFindAndModify', false);
app.use(methodOverride("_method"));
app.use(flash());

//Server Credentials
var user = '';
var password = '';
var host = 'localhost';
var port = '27017';
var database = '';
var connectionString = 'mongodb://' + user + ':' + password + '@' + host +
    ':' + port + '/' + database;

//========
//Database Setup
//========

mongoose.connect(connectionString, { useNewUrlParser: true,
    useUnifiedTopology: true });

/* A blog schema with two main variables: title and body. Created just
    specifies the date the blog was created. Published is not implemented at
    the moment, but it will allow the user to choose if they want their blog
    to be seen by others. The author is an object that refers to a
    corresponding user, in order to show who owns the blog.
*/
var blogSchema = new mongoose.Schema({
    title: String,
    body: String,
    time: String,
    published: Boolean,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    }
});

/* A user schema with a username and password as the basic variables. I added
   a page field for a user with the default value as "mikesHomePage", but this
   is just a temporary value for now. This will allow us to specify custom or
   generic pages for new users.
*/
var userSchema = new mongoose.Schema({
    username: String,
    password: String
});

/* Plugin to use the passportlocalmongoose package with a setting to make all
   usernames lowercase, in order to not have any conflicts.
*/
userSchema.plugin(passportLocalMongoose, {usernameLowerCase: true});

/* This creates a collection if it doesn't exist and pluralizes the name. So
   in the server, there's a collection called "blogs" now. We'll probably need
   one of these for each user, so they have seperate collections.
*/
var blog = mongoose.model("blog", blogSchema);
var User = mongoose.model("User", userSchema);

/* Passport package config. The secret field is any sentence, so I just chose
   a random one. Also saves the user's login indefinitely, unless they logout,
   or clear their cookies.
*/
app.use(session({
    secret: "Some secret sentence",
    store: new mongoStore({mongooseConnection: mongoose.connection, 
    ttl: 5 * 365 * 24 * 60 * 60}),  //5 years
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

/* Passing currentUser to every route. This will be used to display a login and
   register button if a user is not logged in, as well as display a logout
   button if a user is logged in. Can also display a "welcome <user>" messsage.
   This is for future use in the next version.
*/
app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    next();
});

//========
//Blog Routes
//========

//Home page route
app.get("/", function(req, res) {
    res.render("finalLauncher");
});

//Display either michael or judi's writer
app.get("/:writer((michael|judi)swriter)", isLoggedIn, function(req, res) {
    var path = (req.path).replace("/", "");
    path = path.replace(/writer/, "Writer");
    var userName = req.user.username;
    res.render(path, {blog: null, userName: userName});
});

//Displays Michael or Judi's file page
app.get("/:userFile((michael|judi)sfile)", isLoggedIn, function(req, res) {
    var userName = req.user.username;
    blog.find({"author.username": userName}, function(err, blogs) {
        if (err) {
            console.log(err);
        } else {
            var path = (req.path).replace("/", "");
            path = path.replace(/file/, "FilePage");
            res.render(path, { blogsVar: blogs });
        }
    }).sort({time: 'desc'});
});

//Creates a blog
app.post("/:user(michael|judi)", isLoggedIn, function(req, res) {
    var title = req.body.title;
    var body = req.body.body;
    var time = req.body.time;
   var author = {
       id: req.user._id,
       username: req.user.username
   };
    var newBlog = {title: title, body: body, author: author, time: time};
    blog.create(newBlog, function(err, newlyCreated) {
        if (err) {
            console.log(err);
        } else {
            console.log(newlyCreated);
        }
    });
});

//Gets the latest post by Michael or Judi
app.get("/:user(michael|judi)/latest", function(req, res){
    var userName = req.params.user;
    blog.findOne({"author.username": userName}).sort({time: 'desc'}).exec(function(err, blog) {
        if (err) {
            console.log(err);
        } else {
            res.render(req.params.user + "sWriter", {blog: blog});
        }
    });
});

//Displays Michael or Judi's blog list
app.get("/:user(michael|judi)", function(req, res) {
    var userName = req.params.user;
    blog.find({"author.username": userName, published: true}, function(err, blogs) {
        if (err) {
            console.log(err);
        } else {
            res.render(req.params.user + "sHomePage", { blogsVar: blogs });
        }
    }).sort({time: 'desc'});
});

//Displays one of Michael or Judi's blogs
app.get("/:user(michael|judi)/:id", function(req, res) {
    blog.findById(req.params.id, function(err, blog){
        if(err){
            res.redirect("/" + req.params.user);
        } else {
            res.render(req.params.user + "sSingleBlog", {blog: blog});
        }
    });
});

//Displays one of Michael or Judi's blogs in the quickwriter
app.get("/:user(michael|judi)/:id/edit", checkOwnerShip, function(req, res) {
    blog.findById(req.params.id, function(err, blog) {
        if(err) {
            console.log(err);
            res.redirect("/" + req.params.user);
        } else {
            res.render(req.params.user + "sWriter", {blog: blog});
        }
    });
});

//Responsible for isPublished funtionality
app.post("/:user(michael|judi)/:id", function(req, res){
    var published = req.body.published;
    var editedBlog = {published: published};
    blog.findByIdAndUpdate(req.params.id, editedBlog, function(err, blog){
        if(err){
            console.log(err);
        } 
    });
});

//Edits a blog
app.put("/:user(michael|judi)/:id", checkOwnerShip, function(req, res) {
    var title = req.body.title;
    var body = req.body.body;
    var time = req.body.time;
    var editedBlog = {title: title, body: body, time: time};
    blog.findByIdAndUpdate(req.params.id, editedBlog, function(err, blog){
        if(err){
            console.log(err);
        } 
    });
});

//Deletes a blog
app.delete("/:user(michael|judi)/:id", checkOwnerShip, function(req, res) {
    blog.findByIdAndRemove(req.params.id, function(err){
        if(err){
            res.redirect("/" + req.params.user);
        } else {
            res.redirect("/" + req.params.user + "sfile");
        }
    });
});

//========
//Authorization Routes
//========

//Shows the register form
app.get("/register", function(req, res) {
    res.render("register");
});

/* Uses the passport package to help with registration. It takes care of
   salting and hashing the password, so that we never store the actual password
   in the database. After a user registers, it authenticates them, then redirects
   them to their new blogs page.
*/
app.post("/register", function(req, res) {
    var newUser = new User({ username: req.body.username });
    User.register(newUser, req.body.password, function(err, user) {
        if (err) {
            console.log(err);
            return res.render("register");
        }
        passport.authenticate("local")(req, res, function() {
            res.redirect("/" + req.user.username);
        });
    });
});

//Displays Michael or Judi's login page
app.get("/login/:user(michael|judi)", function(req, res) {
    res.render(req.params.user + "sLoginPage", {message: req.flash("error")});
});

//Handles Michael's login
app.post("/login/michael", passport.authenticate("local",
    {
        successRedirect: "/michaelsfile",
        failureRedirect: "/login/michael",
        failureFlash: true}));

//Handles Judi's login
app.post("/login/judi", passport.authenticate("local",
    {
        successRedirect: "/judisfile",
        failureRedirect: "/login/judi",
        failureFlash: true}));

//Logout route.
app.get("/logout", function(req, res) {
    req.session.destroy();
    req.logout();
    res.redirect("/");
});

//========
//Middleware functions
//========

//Function that checks if michael is logged in
function isLoggedIn(req, res, next){
    var page;
    var michaelPattern = /^\/michael.*/;
    var judiPattern = /^\/judi.*/;

    if(req.isAuthenticated()){
        if(michaelPattern.test(req.path)){
            if(req.user.username == "michael"){
                return next();
            }
        } else if(judiPattern.test(req.path)){
            if(req.user.username == "judi"){
                return next();
            }
        } 
    }

    if(michaelPattern.test(req.path)) {
        page = "michael";
    } else {
        page = "judi";
    }
    req.flash("error", "You must be logged in to do that");
    res.redirect("/login/" + page);
}

//Function that checks ownership of a blog
function checkOwnerShip(req, res, next){
    if(req.isAuthenticated()){
        blog.findById(req.params.id, function(err, foundBlog){
            if(err || foundBlog == null){
                req.flash("error", "Blog not found");
                res.redirect("back");
            } else {
                if(foundBlog.author.id.equals(req.user._id)){
                    next();
                } else {
                    req.flash("error", "You do not have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You must be logged in to do that");
        res.redirect("back");
    }
}

app.listen(3000, function() {
    console.log("Listening on port 3000");
});
