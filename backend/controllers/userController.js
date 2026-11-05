import User from "../models/User.js";

export const getUsers = async(req, res) => {
    try {
        const users = await User.find({
            _id: { $ne: req.userId }
        })
            .select("username email createdAt")
            .sort({ username: 1 })
            .lean();

        return res.status(200).json({
            count: users.length,
            users
        });
    } catch (error) {
        console.error("Get users error:", error.message);

        return res.status(500).json({
            message: "Unable to fetch users"
        });
    }
}

// The $ne operator excludes the currently authenticated user, so users can select other people to chat with.