// mongoConnection.js
// MongoDB connection management
// Provides database connection and cleanup utilities

import {MongoClient} from 'mongodb';
import {mongoConfig} from './settings.js';

let _connection = undefined;
let _db = undefined;

// Get database connection
// Returns cached connection or creates new one
export const dbConnection = async () => {
  if (!_connection) {
    _connection = await MongoClient.connect(mongoConfig.serverUrl);
    _db = _connection.db(mongoConfig.database);
  }
  return _db;
};

// Close database connection
// Used for cleanup after seed scripts or tests
export const closeConnection = async () => {
  if (_connection) {
    await _connection.close();
    _connection = undefined;
    _db = undefined;
  }
};

// Default export for backwards compatibility
export default dbConnection;