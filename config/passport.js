import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import User from '../models/userSchema.js';

        
console.log('google working');

dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback', 
    passReqToCallback:true
},
async (req,accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({email: profile.emails[0].value });
        console.log(user);
        if (user && user.blocked) {
            req.flash("error", "User is blocked"); 
            return done(null, false);  
        }


        if (!user) {
            user = new User({
                googleId: profile.id,
                displayName: profile.displayName,
                email: profile.emails[0].value,
                profileImage: profile.photos[0].value,
                fname: profile.name.givenName, 
                lname: profile.name.familyName, 
                password: '' 
            });
          
            await user.save();
        }

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});
export default passport;
