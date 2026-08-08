// src/modules/auth/auth.controller.js
const authService = require('./auth.service');
const Session = require('./session.model');
const User = require('./user.model');
const jwt = require('jsonwebtoken');
const { verifyToken, generateAccessToken, generateRefreshToken } = require('../../shared/utils/jwt.utils');
const crypto = require('crypto');

const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

const setTokenCookies = (res, accessToken, refreshToken) => {
    const isSecure = process.env.COOKIE_SECURE === 'true';
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
    });
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
};

const clearTokenCookies = (res) => {
    const isSecure = process.env.COOKIE_SECURE === 'true';
    res.clearCookie('accessToken', {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax'
    });
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax'
    });
};

class AuthController {

    async signup(req, res) {
        try {
            const { name, email, password, role, phoneNumber } = req.body;
            if (!name || !email || !password || !phoneNumber) {
                return res.status(400).json({ status: 'error', message: 'All fields are required.' });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ status: 'error', message: 'Please provide a valid email address.' });
            }

            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(phoneNumber)) {
                return res.status(400).json({ status: 'error', message: 'Phone number must be a valid 10-digit number.' });
            }

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' 
                });
            }

            const userAgent = req.headers['user-agent'] || '';
            const ipAddress = req.ip || '';

            const result = await authService.registerUser(name, email, password, role, phoneNumber, userAgent, ipAddress);
            
            setTokenCookies(res, result.accessToken, result.refreshToken);

            return res.status(201).json({ 
                status: 'success', 
                data: { user: result.user } 
            });
        } catch (error) {
            return res.status(400).json({ status: 'error', message: error.message });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ status: 'error', message: 'Email and password are required.' });
            }

            const userAgent = req.headers['user-agent'] || '';
            const ipAddress = req.ip || '';

            const result = await authService.loginUser(email, password, userAgent, ipAddress);

            setTokenCookies(res, result.accessToken, result.refreshToken);

            return res.status(200).json({ 
                status: 'success', 
                data: { user: result.user } 
            });
        } catch (error) {
            return res.status(401).json({ status: 'error', message: error.message });
        }
    }

    async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const { name, phoneNumber, profileImage } = req.body;

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (profileImage !== undefined) updateData.profileImage = profileImage;
            
            if (phoneNumber !== undefined) {
                const phoneRegex = /^[0-9]{10}$/;
                if (!phoneRegex.test(phoneNumber)) {
                    return res.status(400).json({ status: 'error', message: 'Phone number must be a valid 10-digit number.' });
                }
                const existingPhone = await User.findOne({ phoneNumber, _id: { $ne: userId } });
                if (existingPhone) {
                    return res.status(400).json({ status: 'error', message: 'Phone number is already registered by another user.' });
                }
                updateData.phoneNumber = phoneNumber;
            }

            const updatedUser = await authService.updateProfile(userId, updateData);
            return res.status(200).json({
                status: 'success',
                message: 'Profile updated successfully!',
                data: updatedUser
            });
        } catch (error) {
            return res.status(400).json({ status: 'error', message: error.message });
        }
    }

    async refresh(req, res) {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ status: 'error', message: 'Refresh token missing.' });
        }

        try {
            // Verify signature. If it fails, catch block will handle it
            const decoded = verifyToken(refreshToken);

            const hashed = hashToken(refreshToken);
            const session = await Session.findOne({ hashedRefreshToken: hashed });

            if (!session) {
                // Token reuse / anomaly detected!
                const decodedUser = jwt.decode(refreshToken);
                if (decodedUser && decodedUser.id) {
                    await Session.deleteMany({ userId: decodedUser.id });
                }
                clearTokenCookies(res);
                return res.status(401).json({ status: 'error', message: 'Token reuse detected. All sessions revoked.' });
            }

            const user = await User.findById(session.userId);
            if (!user) {
                await Session.deleteMany({ userId: session.userId });
                clearTokenCookies(res);
                return res.status(401).json({ status: 'error', message: 'User not found.' });
            }

            // Generate new token pair
            const newAccessToken = generateAccessToken(user._id, user.role);
            const newRefreshToken = generateRefreshToken(user._id, user.role);

            // Update session in DB (RTR)
            session.hashedRefreshToken = hashToken(newRefreshToken);
            session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            session.userAgent = req.headers['user-agent'] || '';
            session.ipAddress = req.ip || '';
            await session.save();

            setTokenCookies(res, newAccessToken, newRefreshToken);

            return res.status(200).json({
                status: 'success',
                data: {
                    user: { 
                        id: user._id, 
                        name: user.name, 
                        email: user.email, 
                        phoneNumber: user.phoneNumber, 
                        role: user.role, 
                        profileImage: user.profileImage || '',
                        kycStatus: user.kycStatus || 'NOT_SUBMITTED',
                        kycDetails: user.kycDetails || {},
                        payoutDetails: user.payoutDetails || {}
                    }
                }
            });
        } catch (error) {
            // Decodes potential userId to clean up sessions
            const decodedUser = jwt.decode(refreshToken);
            if (decodedUser && decodedUser.id) {
                await Session.deleteMany({ userId: decodedUser.id });
            }
            clearTokenCookies(res);
            return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token.' });
        }
    }

    async logout(req, res) {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (refreshToken) {
                const hashed = hashToken(refreshToken);
                await Session.deleteOne({ hashedRefreshToken: hashed });
            }
            clearTokenCookies(res);
            return res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
        } catch (error) {
            return res.status(400).json({ status: 'error', message: error.message });
        }
    }

    async me(req, res) {
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ status: 'error', message: 'User not found.' });
            }
            return res.status(200).json({
                status: 'success',
                data: {
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        phoneNumber: user.phoneNumber,
                        role: user.role,
                        profileImage: user.profileImage || '',
                        kycStatus: user.kycStatus || 'NOT_SUBMITTED',
                        kycDetails: user.kycDetails || {},
                        payoutDetails: user.payoutDetails || {}
                    }
                }
            });
        } catch (error) {
            return res.status(400).json({ status: 'error', message: error.message });
        }
    }
    async submitKyc(req, res) {
        try {
            const userId = req.user.id;
            const { 
                aadharNumber, 
                aadharFile, 
                panNumber, 
                panFile, 
                otherDocType, 
                otherDocNumber, 
                otherDocFile 
            } = req.body;

            if (!aadharNumber || !aadharFile || !panNumber || !panFile) {
                return res.status(400).json({ status: 'error', message: 'Aadhar Card and PAN Card details are required for KYC.' });
            }

            const aadharRegex = /^\d{12}$/;
            if (!aadharRegex.test(aadharNumber)) {
                return res.status(400).json({ status: 'error', message: 'Aadhar Number must be a valid 12-digit number.' });
            }

            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
            if (!panRegex.test(panNumber)) {
                return res.status(400).json({ status: 'error', message: 'PAN Number must be a valid 10-character alphanumeric code.' });
            }

            const updatedUser = await authService.submitKyc(userId, {
                aadharNumber,
                aadharFile,
                panNumber,
                panFile,
                otherDocType,
                otherDocNumber,
                otherDocFile
            });

            return res.status(200).json({
                status: 'success',
                message: 'KYC documents submitted successfully!',
                data: updatedUser
            });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }
}

module.exports = new AuthController();