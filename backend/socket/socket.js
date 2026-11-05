import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const onlineUsers = new Map();

const getTokenFromCookie = (cookieHeader = "") => {
  const tokenCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("token="));

  if (!tokenCookie) {
    return null;
  }
  try {
    return decodeURIComponent(tokenCookie.slice("token=".length));
  } catch {
    return null;
  }
};

export const registerSocketHandlers = (io) => {
  // Authenticate each socket using the same HTTP-only JWT cookie
  io.use(async (socket, next) => {
    try {
      const token = getTokenFromCookie(socket.request.headers.cookie);
      if (!token) {
        return next(new Error("Authetication required"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.userId).select("_id");
      if (!user) {
        return next(new Error("User not found"));
      }

      socket.data.userId = user._id.toString();
      next();
    } catch {
      next(new Error("Socket authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    // A user may have multiple tabs or devices connected.
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }

    onlineUsers.get(userId).add(socket.id);

    // Each user has a private room for future notifications.
    socket.join(`user:${userId}`);

    if (onlineUsers.get(userId).size === 1) {
      io.emit("user_online", { userId });
    }

    // Typing started
    socket.on("typing", async ({ chatId }) => {
      const conversation = await Conversation.findOne({
        _id: chatId,
        participants: userId,
      });

      if (!conversation) return;

      socket.to(`chat:${chatId}`).emit("user_typing", {
        userId,
        chatId,
      });
    });

    // Typing stopped
    socket.on("stop_typing", async ({ chatId }) => {
      const conversation = await Conversation.findOne({
        _id: chatId,
        participants: userId,
      });

      if (!conversation) return;

      socket.to(`chat:${chatId}`).emit("user_stop_typing", {
        userId,
        chatId,
      });
    });

    socket.emit("online_users", Array.from(onlineUsers.keys()));

    console.log(`User connected: ${userId}`);
    // Join only conversations the authenticated user belongs to.
    socket.on("join_chat", async (chatId, acknowledge) => {
      const reply = typeof acknowledge === "function" ? acknowledge : () => {};

      try {
        if (typeof chatId !== "string" || !mongoose.isValidObjectId(chatId)) {
          return reply({
            success: false,
            message: "Invalid conversation ID",
          });
        }

        const conversation = await Conversation.findOne({
          _id: chatId,
          participants: userId,
        }).select("_id");

        if (!conversation) {
          return reply({
            success: false,
            message: "Conversation not found",
          });
        }

        socket.join(`chat:${chatId}`);
        reply({ success: true });
      } catch (error) {
        console.error("Join chat error:", error.message);
        reply({
          success: false,
          message: "Unable to join conersation",
        });
      }
    });

    // Save first, then broadcast to everyone in the conversation.
    socket.on("send_message", async (payload, acknowledge) => {
      const reply = typeof acknowledge === "function" ? acknowledge : () => {};
      try {
        const { chatId, text } = payload || {};
        if (typeof chatId !== "string" || !mongoose.isValidObjectId(chatId)) {
          return reply({
            success: false,
            message: "Invalid conversation ID",
          });
        }
        if (typeof text !== "string" || !text.trim()) {
          return reply({
            success: false,
            message: "Message cannot be wmpty",
          });
        }
        if (text.trim().length > 5000) {
          return reply({
            success: false,
            message: "Message is too long",
          });
        }

        const conversation = await Conversation.findOne({
          _id: chatId,
          participants: userId,
        }).select("_id");

        if (!conversation) {
          return reply({
            success: false,
            message: "Conversation not found",
          });
        }

        const message = await Message.create({
          conversation: conversation._id,
          sender: userId,
          text: text.trim(),
        });

        await Conversation.updateOne(
          { _id: conversation._id },
          { $set: { updatedAt: new Date() } },
        );

        await message.populate("sender", "username");
        const savedMessage = message.toObject();

        io.to(`chat:${chatId}`).emit("new_message", savedMessage);

        reply({
          success: true,
          message: savedMessage,
        });
      } catch (error) {
        console.error("Send message error:", error.message);

        reply({
          success: false,
          message: "Unable to send message",
        });
      }
    });

    socket.on("message_delivered", async ({ messageId, chatId } = {}) => {
      try {
        if (
          !mongoose.isValidObjectId(messageId) ||
          !mongoose.isValidObjectId(chatId)
        ) {
          return;
        }

        const conversation = await Conversation.findOne({
          _id: chatId,
          participants: userId,
        });

        if (!conversation) return;

        const message = await Message.findOneAndUpdate(
          {
            _id: messageId,
            conversation: chatId,
            sender: { $ne: userId },
            status: { $ne: "read" },
          },
          {
            $set: { status: "delivered" },
          },
          { new: true },
        );

        if (!message) return;

        io.to(`chat:${chatId}`).emit("message_status_updated", {
          messageId: message._id.toString(),
          status: "delivered",
        });
      } catch (error) {
        console.error("Delivery status error:", error);
      }
    });

    socket.on("message_read", async ({ chatId } = {}) => {
      try {
        if (!mongoose.isValidObjectId(chatId)) return;

        const conversation = await Conversation.findOne({
          _id: chatId,
          participants: userId,
        });

        if (!conversation) return;

        const unreadMessages = await Message.find({
          conversation: chatId,
          sender: { $ne: userId },
          status: { $ne: "read" },
        }).select("_id");

        await Message.updateMany(
          {
            conversation: chatId,
            sender: { $ne: userId },
            status: { $ne: "read" },
          },
          {
            $set: { status: "read" },
          },
        );

        for (const message of unreadMessages) {
          io.to(`chat:${chatId}`).emit("message_status_updated", {
            messageId: message._id.toString(),
            status: "read",
          });
        }

        io.to(`chat:${chatId}`).emit("messages_read", {
          chatId: chatId.toString(),
          readerId: userId,
        });
      } catch (error) {
        console.error("Read status error:", error);
      }
    });

    socket.on("disconnect", () => {
      const userSockets = onlineUsers.get(userId);

      if (userSockets) {
        userSockets.delete(socket.id);

        // Mark offline only after the last tab/device disconnects.
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);

          io.emit("user_offline", { userId });
        }
      }
      console.log(`User disconnected: ${userId}`);
    });
  });
};
