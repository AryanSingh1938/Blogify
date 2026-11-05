import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

export const createOrGetChat = async(req, res) => {
    try {
        const { userId } = req.body;

        if(typeof userId !== "string" || !mongoose.isValidObjectId(userId) || userId === req.userId){
            return res.status(400).json({
                message: "Invalid recipient"
            });
        }

        const recipient = await User.findById(userId).select("_id");
        if(!recipient){
            return res.status(400).json({
                message: "Recipient not found"
            });
        }

        let conversation = await Conversation.findOne({
            participants: {
                $all: [req.userId, userId]
            },
            $expr: {
                $eq: [{ $size: "$participants" }, 2]
            }
        });

        if(!conversation){
            conversation = await Conversation.create({
                participants: [req.userId, userId]
            });
        }

        await conversation.populate(
            "participants",
            "username email"
        );

        return res.status(200).json({
            conversation
        });
    } catch (error) {
        console.error("Create chat error:", error.message);

        return res.status(500).json({
            message: "Unable to create conversation"
        });
    }
};

export const getMyChats = async(req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.userId
        })
            .populate("participants", "username email")
            .sort({ updatedAt: -1 })
            .lean();

        return res.status(200).json({
            count: conversations.length,
            conversations
        });
    } catch (error) {
        console.error("Get chats error:", error.message);

        return res.status(500).json({
            message: "Unable to fetch conversations"
        });
    }
};

export const getMessages = async(req, res) => {
    try {
        const { chatId } = req.params;

        if(!mongoose.isValidObjectId(chatId)){
            return res.status(400).json({
                message: "Invalid conversation ID"
            });
        }
        
        const conversation = await Conversation.findOne({
            _id: chatId,
            participants: req.userId
        }).select("_id");

        if(!conversation){
            return res.status(404).json({
                message: "Conversation not found"
            });
        }

        const messages = await Message.find({
            conversation: chatId
        })
            .sort({ createdAt: -1, _id: -1 })
            .limit(50)
            .populate("sender", "username")
            .lean();

        messages.reverse();

        return res.status(200).json({
            count: messages.length,
            messages
        });
    } catch (error) {
        console.error("Get messages error:", error.message);

        return res.status(500).json({
            message: "Unable to fetch messages"
        });
    }
};