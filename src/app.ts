import express from "express";
import compression from "compression";  // compresses requests
import session from "express-session";
import bodyParser from "body-parser";
import lusca from "lusca";
// import mongo from "connect-mongo";
import flash from "express-flash";
import path from "path";
// import mongoose from "mongoose";
import connectRedis from "connect-redis";
import redis from "redis";
import passport from "passport";
// import bluebird from "bluebird";
import "reflect-metadata";
import { createConnection } from "typeorm";
import { User } from "./entity/User";
import { 
    // MONGODB_URI, 
    REDIS_URL, 
    SESSION_SECRET 
} from "./util/secrets";

// const MongoStore = mongo(session);
const RedisStore = connectRedis(session);
// eslint-disable-next-line @typescript-eslint/camelcase
const redisClient = redis.createClient(REDIS_URL, { auth_pass: "1993618@jack" });

// Controllers (route handlers)
import * as homeController from "./controllers/home";
// import * as userController from "./controllers/user";
import * as userTmpController from "./controllers/user_tmp";
// import * as apiController from "./controllers/api";;
import * as apiTmpController from "./controllers/api_tmp";
import * as contactController from "./controllers/contact";

// API keys and Passport configuration
// import * as passportConfig from "./config/passport";
import * as passportTmpConfig from "./config/passport_tmp";

// Create Express server
const app = express();

// Connect to MongoDB
// const mongoUrl = MONGODB_URI;
// mongoose.Promise = bluebird;

// mongoose.connect(mongoUrl, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true } ).then(
//     () => { /** ready to use. The `mongoose.connect()` promise resolves to undefined. */ },
// ).catch(err => {
//     console.log("MongoDB connection error. Please make sure MongoDB is running. " + err);
//     // process.exit();
// });

createConnection({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "1993618@jack",
    database: "test",
    entities: [
        User
    ],
    synchronize: true,
    logging: false
}).then(connection => {
    // here you can start to work with your entities
    console.log("MySQL Connect Successfully:", connection.options.database);
}).catch(error => console.log(error));

// Express configuration
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(session({
//     resave: true,
//     saveUninitialized: true,
//     secret: SESSION_SECRET,
//     store: new MongoStore({
//         url: mongoUrl,
//         autoReconnect: true
//     })
// }));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: SESSION_SECRET,
    store: new RedisStore({ 
        client: redisClient
    })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});
app.use((req, res, next) => {
    // After successful login, redirect back to the intended page
    if (!req.user &&
    req.path !== "/login" &&
    req.path !== "/signup" &&
    !req.path.match(/^\/auth/) &&
    !req.path.match(/\./)) {
        req.session.returnTo = req.path;
    } else if (req.user &&
    req.path == "/account") {
        req.session.returnTo = req.path;
    }
    next();
});

app.use(
    express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);

/**
 * Primary app routes.
 */
app.get("/", homeController.index);
app.get("/login", userTmpController.getLogin);
app.post("/login", userTmpController.postLogin);
app.get("/logout", userTmpController.logout);
app.get("/forgot", userTmpController.getForgot);
app.post("/forgot", userTmpController.postForgot);
app.get("/reset/:token", userTmpController.getReset);
app.post("/reset/:token", userTmpController.postReset);
app.get("/signup", userTmpController.getSignup);
app.post("/signup", userTmpController.postSignup);
app.get("/contact", contactController.getContact);
app.post("/contact", contactController.postContact);
app.get("/account", passportTmpConfig.isAuthenticated, userTmpController.getAccount);
app.post("/account/profile", passportTmpConfig.isAuthenticated, userTmpController.postUpdateProfile);
app.post("/account/password", passportTmpConfig.isAuthenticated, userTmpController.postUpdatePassword);
app.post("/account/delete", passportTmpConfig.isAuthenticated, userTmpController.postDeleteAccount);
app.get("/account/unlink/:provider", passportTmpConfig.isAuthenticated, userTmpController.getOauthUnlink);

/**
 * API examples routes.
 */
app.get("/api", apiTmpController.getApi);
app.get("/api/facebook", passportTmpConfig.isAuthenticated, passportTmpConfig.isAuthorized, apiTmpController.getFacebook);

/**
 * OAuth authentication routes. (Sign in)
 */
app.get("/auth/facebook", passport.authenticate("facebook", { scope: ["email", "public_profile"] }));
app.get("/auth/facebook/callback", passport.authenticate("facebook", { failureRedirect: "/login" }), (req, res) => {
    res.redirect(req.session.returnTo || "/");
});

export default app;
