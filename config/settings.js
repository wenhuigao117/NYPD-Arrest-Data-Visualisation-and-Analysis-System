// settings.js
// MongoDB configuration settings

export const mongoConfig = {
  serverUrl: "mongodb://127.0.0.1:27017/",
  database: "nyc_arrests"
};

export const collections = {
  arrests: "arrests",
  users: "users",
  comments: "comments"
};

// For backwards compatibility
export default {
  ...mongoConfig,
  collections
};