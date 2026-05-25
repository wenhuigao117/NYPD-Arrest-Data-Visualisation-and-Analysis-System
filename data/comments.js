import dbConnection from '../config/mongoConnection.js';
import { ObjectId } from 'mongodb';

const collectionName = 'comments';

const exportedMethods = {
  async addComment(userId, arrestId, text) {
    if (!userId || !arrestId || !text) throw new Error('all parameters must be provided');
    if (typeof text !== 'string' || text.trim().length === 0) throw new Error('comment text must be a non-empty string');
    if (!ObjectId.isValid(userId)) throw new Error('invalid user id');
    if (!ObjectId.isValid(arrestId)) throw new Error('invalid arrest id');

    const db = await dbConnection();
    const commentsCollection = db.collection(collectionName);

    const newComment = {
      userId: new ObjectId(userId),
      arrestId: new ObjectId(arrestId),
      text: text.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const insertInfo = await commentsCollection.insertOne(newComment);
    if (!insertInfo.acknowledged || !insertInfo.insertedId) throw new Error('could not add comment');

    return await this.getCommentById(insertInfo.insertedId.toString());
  },

  async getCommentById(id) {
    if (!id || !ObjectId.isValid(id)) throw new Error('invalid comment id');

    const db = await dbConnection();
    const commentsCollection = db.collection(collectionName);
    const comment = await commentsCollection.findOne({ _id: new ObjectId(id) });
    if (!comment) throw new Error('comment not found');

    comment._id = comment._id.toString();
    comment.userId = comment.userId.toString();
    comment.arrestId = comment.arrestId.toString();
    return comment;
  },

  // FIX Bug 5: use $lookup to join username from users collection
  // previously only returned userId, so username never showed in comments
  async getCommentsByArrestId(arrestId) {
    if (!arrestId || !ObjectId.isValid(arrestId)) throw new Error('invalid arrest id');

    const db = await dbConnection();
    const commentsCollection = db.collection(collectionName);

    const comments = await commentsCollection.aggregate([
      { $match: { arrestId: new ObjectId(arrestId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $project: {
          _id: { $toString: '$_id' },
          arrestId: { $toString: '$arrestId' },
          userId: { $toString: '$userId' },
          username: { $arrayElemAt: ['$userInfo.username', 0] },
          text: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ]).toArray();

    return comments;
  },

  async getCommentsByUserId(userId) {
    if (!userId || !ObjectId.isValid(userId)) throw new Error('invalid user id');

    const db = await dbConnection();
    const commentsCollection = db.collection(collectionName);

    const comments = await commentsCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    return comments.map(comment => ({
      ...comment,
      _id: comment._id.toString(),
      userId: comment.userId.toString(),
      arrestId: comment.arrestId.toString()
    }));
  },

  async updateComment(commentId, userId, text) {
    if (!commentId || !userId || !text) throw new Error('all parameters must be provided');
    if (typeof text !== 'string' || text.trim().length === 0) throw new Error('comment text must be a non-empty string');
    if (!ObjectId.isValid(commentId)) throw new Error('invalid comment id');
    if (!ObjectId.isValid(userId)) throw new Error('invalid user id');

    const db = await dbConnection();
    const commentsCollection = db.collection(collectionName);

    const updateInfo = await commentsCollection.updateOne(
      { _id: new ObjectId(commentId), userId: new ObjectId(userId) },
      { $set: { text: text.trim(), updatedAt: new Date() } }
    );

    if (updateInfo.modifiedCount === 0) throw new Error('could not update comment');
    return await this.getCommentById(commentId);
  },

  async deleteComment(commentId, userId) {
    if (!commentId || !userId) throw new Error('all parameters must be provided');
    if (!ObjectId.isValid(commentId)) throw new Error('invalid comment id');
    if (!ObjectId.isValid(userId)) throw new Error('invalid user id');

    const db = await dbConnection();
    const commentsCollection = db.collection(collectionName);

    const deletionInfo = await commentsCollection.deleteOne({
      _id: new ObjectId(commentId),
      userId: new ObjectId(userId)
    });

    if (deletionInfo.deletedCount === 0) throw new Error('could not delete comment');
    return { deleted: true };
  },

  async getAllComments() {
    const db = await dbConnection();
    const commentsCollection = db.collection(collectionName);
    const comments = await commentsCollection.find({}).sort({ createdAt: -1 }).toArray();
    return comments.map(comment => ({
      ...comment,
      _id: comment._id.toString(),
      userId: comment.userId.toString(),
      arrestId: comment.arrestId.toString()
    }));
  },

  async deleteCommentsByArrestId(arrestId) {
    if (!arrestId || !ObjectId.isValid(arrestId)) throw new Error('invalid arrest id');
    const db = await dbConnection();
    const commentsCollection = db.collection(collectionName);
    const deletionInfo = await commentsCollection.deleteMany({ arrestId: new ObjectId(arrestId) });
    return { deletedCount: deletionInfo.deletedCount, deleted: true };
  }
};

export default exportedMethods;
