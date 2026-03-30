const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role,
            adminRole: decoded.adminRole || null
        };

        next();
    } catch (error) {
        console.error("Auth middleware error:", error.message);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token expired"
            });
        }

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

// Admin only middleware
const adminMiddleware = (req, res, next) => {
    // Allow if role is either 'admin' or 'superadmin'
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: "Admin access required"
        });
    }
    next();
};

// Super admin only middleware
const superAdminMiddleware = (req, res, next) => {
    if (req.user.role !== 'superadmin' && req.user.adminRole !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: "Super admin access required"
        });
    }
    next();
};

module.exports = { authMiddleware, adminMiddleware, superAdminMiddleware };