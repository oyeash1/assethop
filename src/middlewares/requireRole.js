// src/middlewares/requireRole.js

const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        // Check karna ki authenticateUser ne user data inject kiya hai ya nahi
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized. You do not have permission to access this feature.'
            });
        }
        next();
    };
};

module.exports = requireRole;