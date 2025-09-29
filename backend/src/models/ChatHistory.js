/**
 * Chat History Model
 * Handles AI conversation history by user and project
 */

const { Pool } = require('pg');

class ChatHistory {
    constructor(pool = null) {
        this.pool = pool || new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'govai',
            user: process.env.DB_USER || 'govaiuser',
            password: process.env.DB_PASSWORD || 'devpass123'
        });
    }

    /**
     * Initialize chat history tables
     */
    async initializeTables() {
        const client = await this.pool.connect();
        try {
            // Chat sessions table - groups related conversations
            await client.query(`
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    project_name VARCHAR(255),
                    session_title VARCHAR(500),
                    session_type VARCHAR(50) DEFAULT 'general', -- general, section_writing, analysis, review
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    message_count INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT true,
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Chat messages table - individual message pairs
            await client.query(`
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    project_name VARCHAR(255),
                    message_pair_id UUID DEFAULT gen_random_uuid(),
                    user_message TEXT NOT NULL,
                    ai_response TEXT NOT NULL,
                    model_used VARCHAR(100),
                    persona_used VARCHAR(100),
                    section_type VARCHAR(100),
                    prompt_tokens INTEGER,
                    response_tokens INTEGER,
                    generation_time_ms INTEGER,
                    context_used JSONB DEFAULT '{}',
                    message_metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Create indexes for efficient queries
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_project
                ON chat_sessions(user_id, project_name);
            `);

            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_chat_sessions_active
                ON chat_sessions(user_id, is_active);
            `);

            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_chat_messages_session
                ON chat_messages(session_id, created_at DESC);
            `);

            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_chat_messages_user_project
                ON chat_messages(user_id, project_name, created_at DESC);
            `);

            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_chat_messages_search
                ON chat_messages USING gin(to_tsvector('english', user_message || ' ' || ai_response));
            `);

            console.log('Chat history tables initialized successfully');
        } catch (error) {
            console.error('Error initializing chat history tables:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Create a new chat session
     */
    async createSession(userId, projectName = null, sessionTitle = null, sessionType = 'general', metadata = {}) {
        const client = await this.pool.connect();
        try {
            // Auto-generate title if not provided
            if (!sessionTitle) {
                const timestamp = new Date().toISOString().split('T')[0];
                sessionTitle = `${sessionType} - ${timestamp}`;
                if (projectName) {
                    sessionTitle = `${projectName}: ${sessionTitle}`;
                }
            }

            const result = await client.query(`
                INSERT INTO chat_sessions (user_id, project_name, session_title, session_type, metadata)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [userId, projectName, sessionTitle, sessionType, JSON.stringify(metadata)]);

            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Get or create active session for user/project
     */
    async getOrCreateActiveSession(userId, projectName = null, sessionType = 'general') {
        const client = await this.pool.connect();
        try {
            // Try to find an active session for this user/project
            let result = await client.query(`
                SELECT * FROM chat_sessions
                WHERE user_id = $1 AND project_name = $2 AND is_active = true
                ORDER BY last_activity DESC
                LIMIT 1
            `, [userId, projectName]);

            if (result.rows.length > 0) {
                // Update last activity
                await client.query(`
                    UPDATE chat_sessions
                    SET last_activity = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [result.rows[0].id]);

                return result.rows[0];
            }

            // Create new session
            return await this.createSession(userId, projectName, null, sessionType);
        } finally {
            client.release();
        }
    }

    /**
     * Add a message pair to a session
     */
    async addMessage(sessionId, userId, userMessage, aiResponse, options = {}) {
        const {
            projectName = null,
            modelUsed = null,
            personaUsed = null,
            sectionType = null,
            promptTokens = null,
            responseTokens = null,
            generationTimeMs = null,
            contextUsed = {},
            messageMetadata = {}
        } = options;

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Insert the message
            const messageResult = await client.query(`
                INSERT INTO chat_messages (
                    session_id, user_id, project_name, user_message, ai_response,
                    model_used, persona_used, section_type, prompt_tokens, response_tokens,
                    generation_time_ms, context_used, message_metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `, [
                sessionId, userId, projectName, userMessage, aiResponse,
                modelUsed, personaUsed, sectionType, promptTokens, responseTokens,
                generationTimeMs, JSON.stringify(contextUsed), JSON.stringify(messageMetadata)
            ]);

            // Update session statistics
            await client.query(`
                UPDATE chat_sessions
                SET message_count = message_count + 1,
                    last_activity = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [sessionId]);

            await client.query('COMMIT');
            return messageResult.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get chat history for a user
     */
    async getUserChatHistory(userId, options = {}) {
        const {
            projectName = null,
            limit = 50,
            offset = 0,
            includeMessages = true,
            sessionId = null
        } = options;

        const client = await this.pool.connect();
        try {
            let sessionQuery = `
                SELECT s.*,
                       u.username, u.full_name as user_name
                FROM chat_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.user_id = $1
            `;
            let queryParams = [userId];
            let paramCount = 1;

            if (projectName) {
                paramCount++;
                sessionQuery += ` AND s.project_name = $${paramCount}`;
                queryParams.push(projectName);
            }

            if (sessionId) {
                paramCount++;
                sessionQuery += ` AND s.id = $${paramCount}`;
                queryParams.push(sessionId);
            }

            sessionQuery += ` ORDER BY s.last_activity DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
            queryParams.push(limit, offset);

            const sessionsResult = await client.query(sessionQuery, queryParams);
            const sessions = sessionsResult.rows;

            if (includeMessages && sessions.length > 0) {
                // Get messages for each session
                const sessionIds = sessions.map(s => s.id);
                const messagesResult = await client.query(`
                    SELECT m.*
                    FROM chat_messages m
                    WHERE m.session_id = ANY($1)
                    ORDER BY m.session_id, m.created_at ASC
                `, [sessionIds]);

                // Group messages by session
                const messagesBySession = {};
                messagesResult.rows.forEach(message => {
                    if (!messagesBySession[message.session_id]) {
                        messagesBySession[message.session_id] = [];
                    }
                    messagesBySession[message.session_id].push(message);
                });

                // Attach messages to sessions
                sessions.forEach(session => {
                    session.messages = messagesBySession[session.id] || [];
                });
            }

            return sessions;
        } finally {
            client.release();
        }
    }

    /**
     * Search chat history
     */
    async searchChatHistory(userId, searchTerm, options = {}) {
        const {
            projectName = null,
            limit = 20,
            offset = 0
        } = options;

        const client = await this.pool.connect();
        try {
            let searchQuery = `
                SELECT m.*, s.session_title, s.session_type,
                       ts_rank(to_tsvector('english', m.user_message || ' ' || m.ai_response),
                               plainto_tsquery('english', $2)) as rank
                FROM chat_messages m
                JOIN chat_sessions s ON m.session_id = s.id
                WHERE m.user_id = $1
                AND to_tsvector('english', m.user_message || ' ' || m.ai_response) @@ plainto_tsquery('english', $2)
            `;
            let queryParams = [userId, searchTerm];
            let paramCount = 2;

            if (projectName) {
                paramCount++;
                searchQuery += ` AND m.project_name = $${paramCount}`;
                queryParams.push(projectName);
            }

            searchQuery += ` ORDER BY rank DESC, m.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
            queryParams.push(limit, offset);

            const result = await client.query(searchQuery, queryParams);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Get conversation context for resuming chats
     */
    async getConversationContext(sessionId, messageLimit = 10) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                SELECT user_message, ai_response, model_used, created_at
                FROM chat_messages
                WHERE session_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            `, [sessionId, messageLimit]);

            return result.rows.reverse(); // Return in chronological order
        } finally {
            client.release();
        }
    }

    /**
     * End/close a chat session
     */
    async endSession(sessionId, userId) {
        const client = await this.pool.connect();
        try {
            await client.query(`
                UPDATE chat_sessions
                SET is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND user_id = $2
            `, [sessionId, userId]);

            return true;
        } finally {
            client.release();
        }
    }

    /**
     * Delete a chat session and all its messages
     */
    async deleteSession(sessionId, userId) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Verify ownership
            const sessionCheck = await client.query(`
                SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2
            `, [sessionId, userId]);

            if (sessionCheck.rows.length === 0) {
                throw new Error('Session not found or not owned by user');
            }

            // Delete messages (cascade should handle this, but being explicit)
            await client.query(`
                DELETE FROM chat_messages WHERE session_id = $1
            `, [sessionId]);

            // Delete session
            await client.query(`
                DELETE FROM chat_sessions WHERE id = $1
            `, [sessionId]);

            await client.query('COMMIT');
            return true;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get chat statistics for a user
     */
    async getUserChatStats(userId, projectName = null) {
        const client = await this.pool.connect();
        try {
            let statsQuery = `
                SELECT
                    COUNT(DISTINCT s.id) as total_sessions,
                    COUNT(m.id) as total_messages,
                    AVG(m.generation_time_ms) as avg_generation_time,
                    SUM(m.prompt_tokens) as total_prompt_tokens,
                    SUM(m.response_tokens) as total_response_tokens,
                    COUNT(DISTINCT m.model_used) as unique_models_used,
                    MIN(s.created_at) as first_chat_date,
                    MAX(s.last_activity) as last_chat_date
                FROM chat_sessions s
                LEFT JOIN chat_messages m ON s.id = m.session_id
                WHERE s.user_id = $1
            `;
            let queryParams = [userId];

            if (projectName) {
                statsQuery += ` AND s.project_name = $2`;
                queryParams.push(projectName);
            }

            const result = await client.query(statsQuery, queryParams);
            return result.rows[0];
        } finally {
            client.release();
        }
    }
}

module.exports = ChatHistory;