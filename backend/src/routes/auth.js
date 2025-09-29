/**
 * Authentication & Authorization API Routes
 * Enterprise OAuth 2.0 authentication with RBAC
 */

const express = require('express');
const passport = require('passport');
const AuthService = require('../services/AuthService');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const authService = new AuthService();

// OAuth Google routes
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=auth_failed' }),
    asyncHandler(async (req, res) => {
        if (req.user.status !== 'active') {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?status=pending_approval`);
        }

        const tokens = await authService.generateTokens(req.user);

        // Set secure HTTP-only cookies
        res.cookie('auth_token', tokens.sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 8 * 60 * 60 * 1000 // 8 hours
        });

        res.cookie('refresh_token', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        await authService.logAuditEvent(req.user.id, 'login_success', 'auth', null, null, {
            oauth_provider: 'google',
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`);
    })
);

// OAuth Microsoft routes
router.get('/microsoft',
    passport.authenticate('microsoft', { scope: ['user.read'] })
);

router.get('/microsoft/callback',
    passport.authenticate('microsoft', { failureRedirect: '/login?error=auth_failed' }),
    asyncHandler(async (req, res) => {
        if (req.user.status !== 'active') {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?status=pending_approval`);
        }

        const tokens = await authService.generateTokens(req.user);

        // Set secure HTTP-only cookies
        res.cookie('auth_token', tokens.sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 8 * 60 * 60 * 1000 // 8 hours
        });

        res.cookie('refresh_token', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        await authService.logAuditEvent(req.user.id, 'login_success', 'auth', null, null, {
            oauth_provider: 'microsoft',
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`);
    })
);

// Development mock authentication
router.post('/mock', asyncHandler(async (req, res) => {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const enableMock = process.env.ENABLE_MOCK_AUTH || 'true';
    if (nodeEnv !== 'development' && enableMock !== 'true') {
        return res.status(403).json({
            success: false,
            message: 'Mock authentication only available in development'
        });
    }

    const { email, role } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email required for mock authentication'
        });
    }

    const user = await authService.findOrCreateMockUser(email, role || 'writer');
    const tokens = await authService.generateTokens(user);

    // Set secure HTTP-only cookies
    res.cookie('auth_token', tokens.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    await authService.logAuditEvent(user.id, 'mock_login', 'auth', null, null, {
        oauth_provider: 'mock',
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
    });

    res.json({
        success: true,
        data: authService.formatUser(user),
        message: 'Mock authentication successful'
    });
}));

// Get current user
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
    const user = await authService.getUserById(req.user.id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    res.json({
        success: true,
        data: authService.formatUser(user)
    });
}));

// Legacy compatibility for existing frontend
router.post('/simulate-login', asyncHandler(async (req, res) => {
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv !== 'development') {
        return res.status(403).json({
            success: false,
            message: 'Simulate login only available in development'
        });
    }

    const { username } = req.body;
    if (!username) {
        return res.status(400).json({
            success: false,
            message: 'Username is required'
        });
    }

    // Convert username to email for mock auth
    const email = username.includes('@') ? username : `${username}@mock.local`;
    const user = await authService.findOrCreateMockUser(email, 'writer');

    res.json({
        success: true,
        data: authService.formatUser(user),
        message: `Logged in as ${user.fullName || user.email}`
    });
}));

// Refresh tokens
router.post('/refresh', asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            message: 'Refresh token not provided'
        });
    }

    const tokens = await authService.refreshTokens(refreshToken);

    // Set new secure HTTP-only cookies
    res.cookie('auth_token', tokens.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
        success: true,
        message: 'Tokens refreshed successfully'
    });
}));

// Logout
router.post('/logout', asyncHandler(async (req, res) => {
    const sessionToken = req.cookies.auth_token;

    if (sessionToken) {
        await authService.logout(sessionToken);
    }

    // Clear cookies
    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
}));

// Admin routes - User management
router.get('/users', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
    const users = await authService.getAllUsers();
    res.json({
        success: true,
        data: users
    });
}));

router.post('/users/:id/approve', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
        return res.status(400).json({
            success: false,
            message: 'Role ID is required'
        });
    }

    const approvedUser = await authService.approveUser(id, req.user.id, roleId);
    res.json({
        success: true,
        data: authService.formatUser(approvedUser),
        message: 'User approved successfully'
    });
}));

// Get available roles
router.get('/roles', authenticateToken, asyncHandler(async (req, res) => {
    const result = await authService.pool.query('SELECT * FROM roles ORDER BY level DESC');
    res.json({
        success: true,
        data: result.rows
    });
}));

// Authentication middleware
async function authenticateToken(req, res, next) {
    const token = req.cookies.auth_token;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    try {
        const decoded = await authService.verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
}

// Admin role middleware
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
}

// Permission middleware factory
function requirePermission(resource, action) {
    return async (req, res, next) => {
        try {
            const hasPermission = await authService.hasPermission(req.user.id, action, resource);
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: `Permission denied: ${resource}.${action}`
                });
            }
            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
}

module.exports = router;
module.exports.authenticateToken = authenticateToken;
module.exports.requireAdmin = requireAdmin;
module.exports.requirePermission = requirePermission;