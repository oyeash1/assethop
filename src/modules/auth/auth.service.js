// src/modules/auth/auth.service.js
const User = require('./user.model');
const Session = require('./session.model');
const { hashPassword, comparePassword } = require('../../shared/utils/encrypt');
const { generateAccessToken, generateRefreshToken } = require('../../shared/utils/jwt.utils');
const crypto = require('crypto');

const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

class AuthService {

    async registerUser(name, email, password, role, phoneNumber, userAgent = '', ipAddress = '') {
        const existingUser = await User.findOne({ email });
        if (existingUser) throw new Error('Email already registered.');

        const existingPhone = await User.findOne({ phoneNumber });
        if (existingPhone) throw new Error('Phone number already registered.');

        const encryptedPassword = await hashPassword(password);

        const user = await User.create({
            name,
            email,
            phoneNumber,
            password: encryptedPassword,
            role
        });

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id, user.role);

        // Save session in DB
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await Session.create({
            userId: user._id,
            hashedRefreshToken: hashToken(refreshToken),
            expiresAt,
            userAgent,
            ipAddress
        });

        return {
            user: { id: user._id, name: user.name, email: user.email, phoneNumber: user.phoneNumber, role: user.role, profileImage: user.profileImage || '' },
            accessToken,
            refreshToken
        };
    }

    async loginUser(email, password, userAgent = '', ipAddress = '') {
        // Manually selecting password since we set 'select: false' in schema
        const user = await User.findOne({ email }).select('+password');
        if (!user) throw new Error('Invalid email or password.');

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) throw new Error('Invalid email or password.');

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id, user.role);

        // Save session in DB
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await Session.create({
            userId: user._id,
            hashedRefreshToken: hashToken(refreshToken),
            expiresAt,
            userAgent,
            ipAddress
        });

        return {
            user: { id: user._id, name: user.name, email: user.email, phoneNumber: user.phoneNumber, role: user.role, profileImage: user.profileImage || '' },
            accessToken,
            refreshToken
        };
    }

    async updateProfile(userId, data) {
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: data },
            { new: true }
        );
        if (!user) throw new Error('User not found.');
        return { id: user._id, name: user.name, email: user.email, phoneNumber: user.phoneNumber, role: user.role, profileImage: user.profileImage || '' };
    }
}

module.exports = new AuthService();