// auth.js
// Authentication middleware
// Provides route protection and user attachment

// Middleware to require authentication
// Redirects to login if user is not authenticated
export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/users/login');
  }
  next();
};

// Middleware to require guest (not logged in)
// Redirects to home if user is already authenticated
export const requireGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  next();
};

// Middleware to attach user to response locals
// Makes user available in all Handlebars templates
export const attachUser = (req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
  } else {
    res.locals.user = null;
  }
  next();
};