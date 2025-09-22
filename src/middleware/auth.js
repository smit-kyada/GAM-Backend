import jwt from "jsonwebtoken";
import models from "../models/index.js";

export const authenticateToken = async (req, res, next) => {
    try {
        const token = req?.headers["x-token"];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access token is required",
                data: null
            });
        }

        const decoded = await jwt.verify(token, process.env.SECRET);
        
        switch (decoded?.type) {
            case "site":
                const site = await models?.Site.findById(decoded.id);
                if (!site || site.isDeleted) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid token",
                        data: null
                    });
                }
                site.role = "client";
                req.user = site;
                next();
                break;
                
            case "user":
                const user = await models?.User.findOne({ 
                    _id: decoded.id, 
                    email: decoded?.email, 
                    userName: decoded?.userName,
                    isDeleted: false
                });
                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid token",
                        data: null
                    });
                }
                req.user = user;
                next();
                break;
                
            default:
                return res.status(401).json({
                    success: false,
                    message: "Invalid token type",
                    data: null
                });
        }
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
            data: null
        });
    }
};
