// logger.js
// Middleware for logging HTTP requests
// Logs method, path, timestamp, and current user

export const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.originalUrl || req.url;
  const user = req.session && req.session.user ? req.session.user.username : 'Guest';
  
  console.log(`[${timestamp}] ${method} ${path} (User: ${user})`);
  
  next();
};