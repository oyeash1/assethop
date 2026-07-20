// src/middlewares/authenticateUser.js
const { verifyToken } = require('../shared/utils/jwt.utils');

const authenticateUser = (req, res, next) => {
    try {
        let token = null;

        // 1. Check cookies first
        if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        } 
        // 2. Fallback to Authorization header
        else {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Access denied. No token provided.'
            });
        }

        // 3. Verify and decode token
        const decoded = verifyToken(token);

        // 4. Inject decoded payload into request
        req.user = decoded;

        next();
    } catch (error) {
        // Return 401 Unauthorized for expired/invalid token to trigger client-side silent refresh
        return res.status(401).json({
            status: 'error',
            message: 'Invalid or expired session token.'
        });
    }
};

module.exports = authenticateUser;