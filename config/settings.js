// settings.js
// MongoDB configuration settings
// Reads from environment variables in production, falls back to local for development

import * as dotenv from 'dotenv';
dotenv.config();

export const mongoConfig = {
  serverUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/',
  database: process.env.MONGODB_URI ? 'nycArrest' : 'nyc_arrests'
};

export const collections = {
  arrests: 'arrests',
  users: 'users',
  comments: 'comments'
};

export default {
  ...mongoConfig,
  collections
};
