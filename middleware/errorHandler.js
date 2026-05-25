// errorHandler.js
// Error handling middleware
// Provides centralized error handling and 404 responses

// Handle 404 errors
// Catches all requests that don't match any route
export const notFoundHandler = (req, res, next) => {
  res.status(404).render('error', {
    title: 'Not Found',
    statusCode: 404,
    message: 'The page you are looking for does not exist.'
  });
};

// Handle all other errors
// Catches errors thrown in routes or middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).render('error', {
    title: 'Error',
    statusCode: statusCode,
    message: message
  });
};