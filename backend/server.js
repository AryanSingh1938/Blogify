import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "node:http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

import { registerSocketHandlers } from "./socket/socket.js";

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

if(!process.env.MONGO_URI || !process.env.JWT_SECRET) {
    throw new Error("MONGO_URI and JWT_SECRET must be configured");
}

app.use(cors({
    origin: CLIENT_URL,
    credentials: true
}));

app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

const io = new Server(httpServer, {
    cors: {
        origin: CLIENT_URL,
        credentials: true
    }
});

registerSocketHandlers(io);

app.get("/", (req, res) => {
    res.status(200).json({
        message: "Real-Time Chat API is running"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);

app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});

const startServer = async () => {
    try {
        await connectDB();

        httpServer.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();