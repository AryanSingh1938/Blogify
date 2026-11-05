import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
});

const createToken = (userId) => {
    return jwt.sign(
        { userId: userId.toString() },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

const safeUser = (user) => ({
    _id: user._id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt
});

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if(typeof username !== "string" || typeof email !== "string" || typeof password !== "string")
        {
            return res.status(400).json({
                message: "Username, email and password are required"
            });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        if(cleanUsername.length < 3 || cleanUsername.length > 30){
            return res.status(400).json({
                message: "Username must be 3-30 characters long"
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                message: "Enter a valid email address"
            });
        }

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                message: "Password must be 8–72 characters long"
            });
        }

        const existingUser = await User.findOne({
            email: cleanEmail
        });

        if(existingUser) {
            return res.status(409).json({
                message: "Email is already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            username: cleanUsername,
            email: cleanEmail,
            password: hashedPassword
        });

        const token = createToken(user._id);

        res.cookie("token", token, cookieOptions());

        return res.status(201).json({
            message: "Registration successful",
            user: safeUser(user)
        });
    } catch (error) {
        if(error.code === 11000){
            return res.status(409).json({
                message: "Email is already registered"
            });
        }
        console.error("Registration error:", error.message);

        return res.status(500).json({
            message: "Unable to register user"
        });
    }
};

export const login = async(req, res) => {
    try {
        const { email, password } = req.body;

        if(typeof email !== "string" || typeof password !== "string"){
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        }).select("+password");

        if(!user){
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);

        if(!passwordMatches){
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = createToken(user._id);
        res.cookie("token", token, cookieOptions());

        return res.status(200).json({
            message: "Login successful",
            user: safeUser(user)
        });
    } catch (error) {
        console.error("Login error:", error.message);
        return res.status(500).json({
            message: "Unable to log in"
        });
    }
};

export const logout = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    });

    return res.status(200).json({
        message: "Logged out successfully"
    });
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select("username email createdAt");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({ user });
    } catch (error) {
        return res.status(500).json({
            message: "Unable to fetch user"
        });
    }
};