// app.js
// Main application entry point
// Express server configuration with session support, middleware, and error handling

import express from 'express';
import session from 'express-session';
import exphbs from 'express-handlebars';
import Handlebars from 'handlebars';
import {fileURLToPath} from 'url';
import {dirname} from 'path';

// Import middleware
import {logger} from './middleware/logger.js';
import {attachUser} from './middleware/auth.js';
import {errorHandler, notFoundHandler} from './middleware/errorHandler.js';

// Import routes
import configRoutes from './routes/index.js';

// Setup __dirname for ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Static file serving
const staticDir = express.static(__dirname + '/public');
app.use('/public', staticDir);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Middleware to rewrite unsupported browser methods (PUT, DELETE)
// Allows browsers to POST with _method=PUT or _method=DELETE
const rewriteUnsupportedBrowserMethods = (req, res, next) => {
  if (req.body && req.body._method) {
    req.method = req.body._method;
    delete req.body._method;
  }
  next();
};
app.use(rewriteUnsupportedBrowserMethods);

// Session configuration
app.use(
  session({
    name: 'AuthCookie',
    secret: 'some secret string',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  })
);

const handlebarsInstance = exphbs.create({
  defaultLayout: 'main',
  helpers: {
    asJSON: (obj, spacing) => {
      const json =
        typeof spacing === 'number'
          ? JSON.stringify(obj, null, spacing)
          : JSON.stringify(obj);
      return new Handlebars.SafeString(json);
    },

    // Math helper for simple arithmetic operations in templates
    math: (lvalue, operator, rvalue) => {
      lvalue = parseFloat(lvalue);
      rvalue = parseFloat(rvalue);
      return {
        '+': lvalue + rvalue,
        '-': lvalue - rvalue,
        '*': lvalue * rvalue,
        '/': lvalue / rvalue,
        '%': lvalue % rvalue
      }[operator];
    },

    // Equality helper for comparisons in templates
    eq: (a, b) => {
      return a === b;
    }
  },
  partialsDir: ['views/partials/']
});
app.engine('handlebars', handlebarsInstance.engine);
app.set('view engine', 'handlebars');

// Apply custom middleware
app.use(logger);      // Log all requests
app.use(attachUser);  // Attach user to res.locals for templates

// Configure routes
configRoutes(app);

// Error handling middleware (must be last)
app.use(notFoundHandler);  // Handle 404
app.use(errorHandler);     // Handle all other errors

// Start server
app.listen(3000, () => {
  console.log("We've now got a server!");
  console.log('Your routes will be running on http://localhost:3000');
});
