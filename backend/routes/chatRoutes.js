import express from "express";
import { createOrGetChat, getMyChats, getMessages } from "../controllers/chatController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.get("/", getMyChats);
router.post("/", createOrGetChat);
router.get("/:chatId/messages", getMessages);

export default router;