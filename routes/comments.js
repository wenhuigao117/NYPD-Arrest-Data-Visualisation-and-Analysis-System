import express from "express";
import { ObjectId } from "mongodb";
import xss from "xss";  //add xss
import commentsData from "../data/comments.js";
import { checkString } from "../data/utils.js";

const router = express.Router();

const validateObjectId = (id, varName = "ID") => {
  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new Error(`${varName} must be a non-empty string`);
  }
  if (!ObjectId.isValid(id.trim())) {
    throw new Error(`${varName} is not a valid ObjectId`);
  }
  return id.trim();
};

router.get("/arrest/:id", async (req, res) => {
  try {
    const arrestId = validateObjectId(req.params.id, "Arrest ID");
    const comments = await commentsData.getCommentsByArrestId(arrestId);
    return res.json({ comments });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    let { arrestId, userId, content } = req.body;

    arrestId = validateObjectId(arrestId, "Arrest ID");
    userId = validateObjectId(userId, "User ID");
    content = checkString(content, "Comment content");
    //xss
    content = xss(content);

    const newComment = await commentsData.addComment(userId, arrestId, content);
    return res.status(201).json(newComment);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const commentId = validateObjectId(req.params.id, "Comment ID");
    let { userId, content } = req.body;

    userId = validateObjectId(userId, "User ID");
    content = checkString(content, "Comment content");

    content = xss(content);

    const updatedComment = await commentsData.updateComment(
      commentId,
      userId,
      content
    );

    return res.json(updatedComment);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const commentId = validateObjectId(req.params.id, "Comment ID");
    let { userId } = req.body;

    userId = validateObjectId(userId, "User ID");

    const result = await commentsData.deleteComment(commentId, userId);
    return res.json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

router.get("/user/:id", async (req, res) => {
  try {
    const userId = validateObjectId(req.params.id, "User ID");
    const comments = await commentsData.getCommentsByUserId(userId);

    return res.render("userComments", {
      title: "My Comments",
      comments,
    });
  } catch (e) {
    return res.status(400).render("error", { error: e });
  }
});

export default router;