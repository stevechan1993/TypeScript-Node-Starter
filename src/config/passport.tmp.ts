import passport from "passport";
import passportLocal from "passport-local";
import passportFacebook from "passport-facebook";
import _ from "lodash";

import { getManager } from "typeorm";
import { User } from "../entity/User";
import { Request, Response, NextFunction} from "express";

const LocalStrategy = passportLocal.Strategy;
const FacebookStrategy  = passportFacebook.Strategy;
// get a post repository to perform operations with post
const userRepository = getManager().getRepository(User);

passport.serializeUser<any, any>((user, done) => {
  done(undefined, user.id);
});

passport.deserializeUser((id, done)=> {
  userRepository.findOne(id).then(user =>{
    done(user);
  }).catch(err => {
    done(err);
  });
});

/**
 * Sign in using Email and Password.
 */
passport.use(new LocalStrategy({ usernameField: "email"}, (email, password, done)=> {
  userRepository.findOne({ email: email.toLowerCase()}).then((user: any) => {
    if (!user) {
      return done(undefined, false, { message: `Email ${email} not found.`});
    }
    user.comparePassword(password, (err: Error, isMatch: boolean) => {
      if (err) {return done(err);}
      if (isMatch) {
        return done(undefined, user);
      }
      return done(undefined, false, {message: "Invalid email or password."});
    });
  }).catch(err => {
    return done(err);
  });
}));

/**
 * OAuth Strategy Overview
 *
 * - User is already logged in.
 *   - Check if there is an existing account with a provider id.
 *     - If there is, return an error message. (Account merging not supported)
 *     - Else link new OAuth account with currently logged-in user.
 * - User is not logged in.
 *   - Check if it's a returning user.
 *     - If returning user, sign in and we are done.
 *     - Else check if there is an existing account with user's email.
 *       - If there is, return an error message.
 *       - Else create a new account.
 */

 /**
  * Sign in with Facebook.
  */
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_ID,
  clientSecret: process.env.FACEBOOK_SECRET,
  callbackURL: "/auth/facebook/callback",
  profileFields: ["name", "email","link", "locale", "timezone"],
  passReqToCallback: true
}, (req: any, accessToken, refreshToken, profile, done) => {
  if (req.user) {
    userRepository.findOne({facebook: profile.id}).then(existingUser => {
      if (existingUser) {
        req.flash("errors", { msg: "There is already a Facebook account that belongs to you. Sign in with that account or delete it, then link it with your current account."});
        done(undefined);
      } else {
        userRepository.findOne(req.user.id).then((user: any) => {
          user.facebook = profile.id;
          user.tokens.push({kind: "facebook", accessToken});
          user.profile.name = user.profile.name || `${profile.name.givenName} ${profile.name.familyName}`;
          user.profile.gender = user.profile.gender || profile._json.gender;
          user.profile.picture = user.profile.picture || `https://graph.facebook.com/${profile.id}/picture?type=large`;
          user.save((err: Error) => {
            req.flash("info", { msg: "Facebook account has been linked."});
            done(err, user);
          });
        }).catch(err => {
          done(err);
        });
      }
    }).catch(err => {
      done(err);
    });
  } else {
    userRepository.findOne({facebook: profile.id}).then(existingUser => {
      if (existingUser) {
        return done(undefined, existingUser);
      }
      userRepository.findOne({email: profile._json.email}).then(existingEmailUser => {
        if (existingEmailUser) {
          req.flash("errors", {msg: "There is already an account using this email address. Sign in to that account and link it with Facebook manually from Account Settings."});
          done(undefined);
        } else {
          const user: any  = new User();
          user.email = profile._json.email;
          user.facebook = profile.id;
          user.tokens.push({kind: "facebook", accessToken});
          user.profile.name = `${profile.name.givenName} ${profile.name.familyName}`;
          user.profile.gender = profile._json.gender;
          user.profile.picture = `https://graph.facebook.com/${profile.id}/picture?type=large`;
          user.profile.location = (profile._json.location) ? profile._json.location.name : "";
          user.save((err: Error) => {
            done(err, user);
          });
        }
      }).catch(err => {
        done(err);
      });
    }).catch(err => {
      done(err);
    });
  }
}));

/**
 * Login Required midddleware.
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
};

/**
 * Authorization Required middleware.
 */
export const isAuthorized = (req: Request, res: Response, next: NextFunction) => {
  const provider = req.path.split("/").slice(-1)[0];

  const user = new User();
  if (_.find(user.tokens, {kind: provider})) {
    next();
  } else {
    res.redirect(`/auth/${provider}`);
  }
};
