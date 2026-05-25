// config/mongoCollections.js
// Collection accessor functions
// Each function returns a cached collection reference

import {dbConnection} from './mongoConnection.js';
import {collections} from './settings.js';

// Generic collection getter with caching
// This pattern ensures we reuse the same collection reference
const getCollectionFn = (collection) => {
  let _col = undefined;
  
  return async () => {
    if (!_col) {
      const db = await dbConnection();
      _col = await db.collection(collection);
    }
    return _col;
  };
};

// Export collection accessors
export const arrests = getCollectionFn(collections.arrests);
export const users = getCollectionFn(collections.users);
export const comments = getCollectionFn(collections.comments);