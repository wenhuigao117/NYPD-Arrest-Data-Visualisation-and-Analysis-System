import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import dbConnection from "../config/mongoConnection.js";
import { checkId, validatePassword, validateUsername, validateEmail } from "./utils.js";

const saltRounds = 10;

const exportedMethods = {
  async createUser({ username, password, email }) {
    username = validateUsername(username);
    password = validatePassword(password);
    email = validateEmail(email);

    const db = await dbConnection();
    const usersCol = db.collection("users");

    const existingUsername = await usersCol.findOne({ username });
    if (existingUsername) throw "Username already exists";

    const existingEmail = await usersCol.findOne({ email });
    if (existingEmail) throw "Email already exists";

    const hashed = await bcrypt.hash(password, saltRounds);
    const user = {
      username,
      email,
      password: hashed,
      createdAt: new Date(),
      favorites: [],
      comments: []
    };
    const insertInfo = await usersCol.insertOne(user);
    if (!insertInfo.acknowledged || !insertInfo.insertedId) throw "Could not create user";
    user._id = insertInfo.insertedId;
    delete user.password;
    return user;
  },

  async getUserById(id) {
    id = checkId(id);
    const db = await dbConnection();
    const usersCol = db.collection("users");
    const user = await usersCol.findOne({ _id: new ObjectId(id) });
    if (!user) throw "User not found";
    delete user.password;
    return user;
  },

  async getUserByUsername(username) {
    if (!username || typeof username !== "string" || !username.trim()) throw "Invalid username";
    const db = await dbConnection();
    const usersCol = db.collection("users");
    const user = await usersCol.findOne({ username: username.trim().toLowerCase() });
    if (!user) throw "User not found";
    delete user.password;
    return user;
  },

  async verifyUser(username, password) {
    if (!username || typeof username !== "string" || !username.trim()) throw "Invalid username or password";
    if (!password || typeof password !== "string") throw "Invalid username or password";

    const db = await dbConnection();
    const usersCol = db.collection("users");
    const user = await usersCol.findOne({ username: username.trim().toLowerCase() });

    // FIX: unified error message regardless of whether username or password is wrong
    // prevents username enumeration attacks
    if (!user) throw "Invalid username or password";
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw "Invalid username or password";

    delete user.password;
    return user;
  },

  async addFavorite(userId, arrestId) {
    userId = checkId(userId);
    arrestId = checkId(arrestId);
    const db = await dbConnection();
    const usersCol = db.collection("users");
    const updateInfo = await usersCol.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { favorites: arrestId } }
    );
    if (updateInfo.modifiedCount === 0) throw "Could not add favorite";
    return true;
  },

  async removeFavorite(userId, arrestId) {
    userId = checkId(userId);
    arrestId = checkId(arrestId);
    const db = await dbConnection();
    const usersCol = db.collection("users");
    const updateInfo = await usersCol.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { favorites: arrestId } }
    );
    if (updateInfo.modifiedCount === 0) throw "Could not remove favorite";
    return true;
  }
};

export default exportedMethods;
