// users.js - user authentication and profile routes

import { Router } from "express";
import usersData from "../data/users.js";
import { requireAuth, requireGuest } from "../middleware/auth.js";
import { checkString, validatePassword, validateUsername, validateEmail } from "../data/utils.js";
import xss from "xss"
const router = Router();

// GET /users/login - Display login page
router.get("/login", requireGuest, (req, res) => {
  res.render("login", { title: "Login" });
});

// POST /users/login - Handle user login
router.post("/login", requireGuest, async (req, res) => {
  try {
    let { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).render("login", { 
        error: "Username and password are required",
        title: "Login"
      });
    }

    username = checkString(username, "username");
    username = xss(username);
    
    // Validate password without trimming (security: preserve user intent)
    if (typeof password !== "string" || password.length === 0) {
      throw "Invalid password";
    }

    // Verify user credentials
    const user = await usersData.verifyUser(username, password);

    // Set session
    req.session.user = {
      _id: user._id,
      username: user.username,
      email: user.email
    };

    return res.redirect("/");
  } catch (e) {
    return res.status(401).render("login", { 
      error: e,
      title: "Login"
    });
  }
});

// GET /users/register - Display registration page
router.get("/register", requireGuest, (req, res) => {
  res.render("register", { title: "Register" });
});

// POST /users/register - Handle user registration
router.post("/register", requireGuest, async (req, res) => {
  try {
    let { username, password, confirmPassword, email } = req.body;

    // Validate input
    if (!username || !password || !confirmPassword || !email) {
      return res.status(400).render("register", { 
        error: "All fields are required",
        title: "Register"
      });
    }

    // Validate password match (before validation/trimming)
    if (password !== confirmPassword) {
      return res.status(400).render("register", { 
        error: "Passwords do not match",
        title: "Register"
      });
    }

    // Validate username and email using checkString
    username = validateUsername(xss(username));
    email = validateEmail(xss(email));
    password = validatePassword(password);

    // Create user
    const newUser = await usersData.createUser({
      username: username,
      password: password,
      email: email
    });

    // Automatically log in the new user
    req.session.user = {
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email
    };

    return res.redirect("/");
  } catch (e) {
    return res.status(400).render("register", { 
      error: e,
      title: "Register"
    });
  }
});

// GET /users/profile - Display user profile
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const user = await usersData.getUserById(req.session.user._id);
    return res.render("userProfile", { 
      user,
      title: "My Profile"
    });
  } catch (e) {
    return res.status(404).render("error", { 
      error: "User not found",
      statusCode: 404,
      title: "Error"
    });
  }
});

// POST /users/add-favorite - Add arrest to favorites
router.post("/add-favorite", requireAuth, async (req, res) => {
  try {
    let { arrestId } = req.body;
    if (!arrestId || typeof arrestId !== "string" || !arrestId.trim()) {
      return res.status(400).json({ error: "Invalid arrest ID" });
    }
    arrestId = xss(arrestId.trim());
    
    await usersData.addFavorite(req.session.user._id, arrestId);
    res.json({ success: true, message: "Added to favorites" });
  } catch (e) {
    res.status(400).json({ error: e.toString() });
  }
});

// POST /users/remove-favorite - Remove arrest from favorites
router.post("/remove-favorite", requireAuth, async (req, res) => {
  try {
    let { arrestId } = req.body;
    if (!arrestId || typeof arrestId !== "string" || !arrestId.trim()) {
      return res.status(400).json({ error: "Invalid arrest ID" });
    }
    arrestId = xss(arrestId.trim());
    
    await usersData.removeFavorite(req.session.user._id, arrestId);
    res.json({ success: true, message: "Removed from favorites" });
  } catch (e) {
    res.status(400).json({ error: e.toString() });
  }
});

// GET /users/favorite-status/:arrestId - Check if arrest is favorited
router.get("/favorite-status/:arrestId", requireAuth, async (req, res) => {
  try {
    let { arrestId } = req.params;
    if (!arrestId || typeof arrestId !== "string" || !arrestId.trim()) {
      return res.status(400).json({ error: "Invalid arrest ID" });
    }
    arrestId = xss(arrestId.trim());
    
    const user = await usersData.getUserById(req.session.user._id);
    const isFavorite = user.favorites && user.favorites.includes(arrestId);
    
    res.json({ isFavorite });
  } catch (e) {
    res.status(400).json({ error: e.toString() });
  }
});

// GET /users/logout - Logout user
router.get("/logout", requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/?error=logout_failed");
    }
    return res.redirect("/");
  });
});

export default router;