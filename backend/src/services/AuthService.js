/**
 * Authentication & Authorization Service
 * Enterprise-grade OAuth 2.0 authentication with RBAC
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class AuthService {
    constructor(pool) {
        this.pool = pool || new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'govai',
            user: process.env.DB_USER || 'govaiuser',
            password: process.env.DB_PASSWORD || 'password'
        });

        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        this.jwtExpiry = process.env.JWT_EXPIRES_IN || '8h';
        this.refreshExpiry = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

        this.setupPassport();
    }

    setupPassport() {
        // Google OAuth Strategy
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            passport.use(new GoogleStrategy({
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: "/auth/google/callback"
            }, async (accessToken, refreshToken, profile, done) => {
                try {
                    const user = await this.findOrCreateOAuthUser('google', profile);
                    return done(null, user);
                } catch (error) {
                    return done(error, null);
                }
            }));
        }

        // Microsoft OAuth Strategy
        if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
            passport.use(new MicrosoftStrategy({
                clientID: process.env.MICROSOFT_CLIENT_ID,
                clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
                callbackURL: "/auth/microsoft/callback",
                scope: ['user.read']
            }, async (accessToken, refreshToken, profile, done) => {
                try {
                    const user = await this.findOrCreateOAuthUser('microsoft', profile);
                    return done(null, user);
                } catch (error) {
                    return done(error, null);
                }
            }));
        }

        // Development Mock Strategy - defaults to development mode
        const nodeEnv = process.env.NODE_ENV || 'development';
        const enableMock = process.env.ENABLE_MOCK_AUTH || 'true';
        if (nodeEnv === 'development' || enableMock === 'true') {
            this.setupMockAuth();
        }

        passport.serializeUser((user, done) => {
            done(null, user.id);
        });

        passport.deserializeUser(async (id, done) => {
            try {
                const user = await this.getUserById(id);
                done(null, user);
            } catch (error) {
                done(error, null);
            }
        });
    }

    setupMockAuth() {
        // Mock authentication for development
        passport.use('mock', {
            authenticate: async (req, options) => {
                const { email, role } = req.body;
                if (!email) {
                    return options.fail('Email required for mock auth');
                }

                try {
                    const user = await this.findOrCreateMockUser(email, role || 'writer');
                    return options.success(user);
                } catch (error) {
                    return options.fail(error.message);
                }
            }
        });
    }

    async findOrCreateOAuthUser(provider, profile) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Check if user already exists
            const existingUser = await client.query(
                'SELECT u.*, r.name as role_name, r.permissions FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.oauth_provider = $1 AND u.oauth_id = $2',
                [provider, profile.id]
            );

            if (existingUser.rows.length > 0) {
                await this.updateLastLogin(existingUser.rows[0].id, client);
                await client.query('COMMIT');
                return existingUser.rows[0];
            }

            // Extract user info from profile
            const email = this.extractEmail(profile);
            const firstName = this.extractFirstName(profile);
            const lastName = this.extractLastName(profile);
            const avatarUrl = this.extractAvatarUrl(profile);

            // Check if email already exists with different provider
            const emailCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
            if (emailCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                throw new Error(`User with email ${email} already exists with different authentication provider`);
            }

            // Create new user with pending status
            const newUser = await client.query(`
                INSERT INTO users (oauth_provider, oauth_id, email, first_name, last_name, avatar_url,
                                 status, email_verified, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'awaiting_approval', true, CURRENT_TIMESTAMP)
                RETURNING *
            `, [provider, profile.id, email, firstName, lastName, avatarUrl]);

            // Create default preferences
            await client.query(`
                INSERT INTO user_preferences (user_id, theme_palette, theme_background)
                VALUES ($1, 'light', 'none')
            `, [newUser.rows[0].id]);

            // Log user registration
            await this.logAuditEvent(newUser.rows[0].id, 'user_registered', 'auth', null, null, {
                oauth_provider: provider,
                email: email
            }, client);

            await client.query('COMMIT');

            // Notify admins of pending approval
            await this.notifyAdminsOfPendingUser(newUser.rows[0]);

            return newUser.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async findOrCreateMockUser(email, roleName = 'admin') {
        const client = await this.pool.connect();

        try {
            // Get role ID for the requested role
            const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [roleName]);
            const roleId = roleResult.rows.length > 0 ? roleResult.rows[0].id : null;

            // Check if mock user exists
            const existingUser = await client.query(
                'SELECT u.*, r.name as role_name, r.permissions FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                // Update the user's role if it's different
                if (existingUser.rows[0].role_id !== roleId && roleId !== null) {
                    await client.query(
                        'UPDATE users SET role_id = $1 WHERE id = $2',
                        [roleId, existingUser.rows[0].id]
                    );

                    // Fetch updated user with new role info
                    const updatedUser = await client.query(
                        'SELECT u.*, r.name as role_name, r.permissions FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
                        [existingUser.rows[0].id]
                    );
                    return updatedUser.rows[0];
                }
                return existingUser.rows[0];
            }

            // Create mock user with unique username
            const baseUsername = email.split('@')[0]; // Extract username from email
            const uniqueId = require('uuid').v4().split('-')[0]; // Get first part of UUID for uniqueness
            const username = `${baseUsername}_${uniqueId}`; // Make username unique
            const fullName = `Mock User (${baseUsername})`; // Set a descriptive full name
            const newUser = await client.query(`
                INSERT INTO users (oauth_provider, oauth_id, email, username, first_name, last_name, full_name,
                                 role_id, status, email_verified, approved_at, created_at)
                VALUES ('mock', $1, $2, $3, $4, $5, $6, $7, 'active', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            `, [`mock-${require('uuid').v4()}`, email, username, 'Mock', 'User', fullName, roleId]);

            // Get the full user with role information
            const fullUser = await client.query(
                'SELECT u.*, r.name as role_name, r.permissions FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
                [newUser.rows[0].id]
            );

            return fullUser.rows[0];

        } finally {
            client.release();
        }
    }

    extractEmail(profile) {
        if (profile.emails && profile.emails.length > 0) {
            return profile.emails[0].value;
        }
        return profile._json?.mail || profile._json?.userPrincipalName || null;
    }

    extractFirstName(profile) {
        return profile.name?.givenName || profile._json?.givenName || 'Unknown';
    }

    extractLastName(profile) {
        return profile.name?.familyName || profile._json?.surname || 'User';
    }

    extractAvatarUrl(profile) {
        return profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;
    }

    async generateTokens(user) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role_name,
            permissions: user.permissions,
            oauth_provider: user.oauth_provider
        };

        const token = jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiry });
        const refreshToken = jwt.sign({ id: user.id }, this.jwtSecret, { expiresIn: this.refreshExpiry });

        // Store session in database
        const sessionToken = uuidv4();
        const expiresAt = new Date(Date.now() + (8 * 60 * 60 * 1000)); // 8 hours
        const refreshExpiresAt = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 days

        await this.pool.query(`
            INSERT INTO user_sessions (user_id, session_token, refresh_token, expires_at, refresh_expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `, [user.id, sessionToken, refreshToken, expiresAt, refreshExpiresAt]);

        return { token, refreshToken, sessionToken };
    }

    async verifyToken(sessionToken) {
        try {
            // Check if session is still valid
            const session = await this.pool.query(`
                SELECT s.*, u.*, r.name as role_name, r.permissions FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE s.session_token = $1 AND s.is_active = true AND s.expires_at > CURRENT_TIMESTAMP
            `, [sessionToken]);

            if (session.rows.length === 0 || session.rows[0].status !== 'active') {
                throw new Error('Session expired or user inactive');
            }

            // Update last accessed
            await this.pool.query(`
                UPDATE user_sessions SET last_accessed = CURRENT_TIMESTAMP WHERE session_token = $1
            `, [sessionToken]);

            const user = session.rows[0];
            return {
                id: user.user_id || user.id,
                email: user.email,
                role: user.role_name,
                permissions: user.permissions,
                oauth_provider: user.oauth_provider
            };
        } catch (error) {
            console.error('Token verification error:', error);
            throw new Error('Invalid token');
        }
    }

    async refreshTokens(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, this.jwtSecret);

            // Check if refresh token is valid
            const session = await this.pool.query(`
                SELECT s.*, u.* FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.refresh_token = $1 AND s.is_active = true AND s.refresh_expires_at > CURRENT_TIMESTAMP
            `, [refreshToken]);

            if (session.rows.length === 0 || session.rows[0].status !== 'active') {
                throw new Error('Refresh token expired or invalid');
            }

            const user = session.rows[0];

            // Generate new tokens
            const tokens = await this.generateTokens(user);

            // Invalidate old session
            await this.pool.query(`
                UPDATE user_sessions SET is_active = false WHERE refresh_token = $1
            `, [refreshToken]);

            return tokens;
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }

    async logout(sessionToken) {
        await this.pool.query(`
            UPDATE user_sessions SET is_active = false WHERE session_token = $1
        `, [sessionToken]);
    }

    // Legacy compatibility methods
    async getCurrentUser(req) {
        if (req.user) {
            return this.formatUser(req.user);
        }

        // Fallback for development
        const nodeEnv = process.env.NODE_ENV || 'development';
        if (nodeEnv === 'development') {
            const query = 'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.status = $1 ORDER BY u.id LIMIT 1';
            const result = await this.pool.query(query, ['active']);
            return result.rows.length > 0 ? this.formatUser(result.rows[0]) : null;
        }

        return null;
    }

    async getUserById(id) {
        const result = await this.pool.query(`
            SELECT u.*, r.name as role_name, r.permissions, r.level as role_level
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1
        `, [id]);

        return result.rows[0] || null;
    }

    async getAllUsers() {
        const result = await this.pool.query(`
            SELECT u.*, r.name as role_name, r.permissions
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.status IN ('active', 'awaiting_approval')
            ORDER BY u.first_name, u.last_name
        `);

        return result.rows.map(row => this.formatUser(row));
    }

    async hasPermission(userId, action, resource, projectName = null) {
        try {
            const user = await this.getUserById(userId);
            if (!user || !user.permissions) return false;

            const resourcePerms = user.permissions[resource];
            if (!resourcePerms) return false;

            return resourcePerms[action] === true;
        } catch (error) {
            console.error(`Error checking permissions: ${error.message}`);
            return false;
        }
    }

    hasRoleLevel(user, requiredLevel) {
        return user.role_level >= requiredLevel;
    }

    async updateLastLogin(userId, client = null) {
        const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1';

        if (client) {
            await client.query(query, [userId]);
        } else {
            await this.pool.query(query, [userId]);
        }
    }

    async logAuditEvent(userId, eventType, eventCategory, resourceType, resourceId, details, client = null) {
        const query = `
            INSERT INTO audit_logs (user_id, event_type, event_category, resource_type, resource_id, details, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        `;

        const params = [userId, eventType, eventCategory, resourceType, resourceId, JSON.stringify(details)];

        if (client) {
            await client.query(query, params);
        } else {
            await this.pool.query(query, params);
        }
    }

    async notifyAdminsOfPendingUser(user) {
        console.log(`New user pending approval: ${user.email} (${user.oauth_provider})`);
    }

    async approveUser(userId, approverId, roleId) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const result = await client.query(`
                UPDATE users
                SET status = 'active', role_id = $2, approved_by = $3, approved_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `, [userId, roleId, approverId]);

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            await this.logAuditEvent(approverId, 'user_approved', 'user_mgmt', 'user', userId, {
                approved_user_email: result.rows[0].email,
                assigned_role_id: roleId
            }, client);

            await client.query('COMMIT');

            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    formatUser(row) {
        return {
            id: row.id,
            username: row.username || row.email,
            email: row.email,
            fullName: row.full_name || `${row.first_name} ${row.last_name}`,
            firstName: row.first_name,
            lastName: row.last_name,
            role: row.role_name || row.role,
            roleName: row.role_name,
            permissions: row.permissions,
            roleLevel: row.role_level,
            status: row.status,
            oauthProvider: row.oauth_provider,
            avatarUrl: row.avatar_url,
            isActive: row.is_active !== false && row.status === 'active',
            createdAt: row.created_at,
            lastLogin: row.last_login
        };
    }
}

module.exports = AuthService;