import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import flash from "connect-flash";
import passport from "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import path from "path";
import nocache from "nocache";
import cookieParser from "cookie-parser";
import methodOverride from "method-override";
import { fileURLToPath } from "url";
import { homepage } from "./controllers/homeController.js";
import compression from "compression";
// import morgan from "morgan";
import fs from "fs";
import helmet from "helmet";

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ limit: "150mb", extended: true }));
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(flash());
app.use(nocache());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// const userLogStream = fs.createWriteStream(
//   path.join(process.cwd(), "user-access.log"),
//   { flags: "a" }
// );
// const adminLogStream = fs.createWriteStream(
//   path.join(process.cwd(), "admin-access.log"),
//   { flags: "a" }
// );

// app.use("/user", morgan("combined", { stream: userLogStream }));

// app.use("/admin", morgan("combined", { stream: adminLogStream }));

// app.use(morgan("dev"));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 72 * 60 * 1000,
    },
  })
);

app.set("views", path.join(process.cwd(), "views"));
app.set("view engine", "ejs");

app.use((req, res, next) => {
  res.locals.flashMessage = req.flash("msg");
  next();
});

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use(passport.initialize());
app.use(passport.session());
app.use(authRoutes);
app.use(compression());

// Google OAuth routes
// app.get('/auth/google',
//     passport.authenticate('google', { scope: ['profile', 'email'] })
// );
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/user/login",
    failureFlash: true,
  }),
  (req, res) => {
    req.session.user = req.user._id;

    res.redirect("/user/home");
  }
);

app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

app.get("/", homepage);
app.use("/user", userRoutes);
app.use("/admin", adminRoutes);
app.use((req, res) => {
  if (req.originalUrl.startsWith("/admin")) {
    res
      .status(404)
      .render("admin/error", { errorMessage: "Admin Page Not Found" });
  } else {
    res.status(404).render("user/error", { errorMessage: "Page Not Found" });
  }
});

const PORT = process.env.PORT || 8010;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
  });
