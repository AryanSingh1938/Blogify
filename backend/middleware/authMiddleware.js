import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async(req, res, next) => {
    try {
        const token = req.cookies.token;

        if(!token){
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId).select("_id");

        if(!user){
            return res.status(401).json({
                message: "User no longer exists"
            });
        }

        req.userId = user._id.toString();

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired authentication token"
        });
    }
};

export default authMiddleware;