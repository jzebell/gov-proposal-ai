const express = require('express');
const http = require('http');
const { Server } = require('ws');
const cors = require('cors');
const { Pool } = require('pg');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const session = require('express-session');
const documentsRouter = require('./routes/documents');
const analysisRouter = require('./routes/analysis');
const pastPerformanceRouter = require('./routes/pastPerformance');
const aiWritingRouter = require('./routes/aiWriting');
const complianceRouter = require('./routes/compliance');
const authRouter = require('./routes/auth');
const projectsRouter = require('./routes/projects');
const personasRouter = require('./routes/personas');
const globalSettingsRouter = require('./routes/globalSettings');
const globalPromptsRouter = require('./routes/globalPrompts');
const contextRouter = require('./routes/context');
const citationsRouter = require('./routes/citations');
const analyticsRouter = require('./routes/analytics');
const documentTypesRouter = require('./routes/documentTypes');
const uploadDefaultsRouter = require('./routes/uploadDefaults');
const AuthService = require('./services/AuthService');
const GlobalPromptService = require('./services/GlobalPromptService');

/**
 * Basic Express.js app with WebSocket, PostgreSQL, and Ollama LLM integration.
 */


// --- Configuration ---
const PORT = process.env.PORT || 3001;
const PG_CONFIG = {
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'govaiuser'}:${process.env.DB_PASSWORD || 'devpass123'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'govai'}`,
};
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// --- PostgreSQL Pool ---
const pool = new Pool(PG_CONFIG);

// --- Express App Setup ---
const app = express();

// Initialize authentication service to set up passport strategies
const authService = new AuthService();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(cookieParser());

// Session middleware for OAuth
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());


app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/past-performance', pastPerformanceRouter);
app.use('/api/ai-writing', aiWritingRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/personas', personasRouter);
app.use('/api/global-settings', globalSettingsRouter);
app.use('/api/global-prompts', globalPromptsRouter);
app.use('/api/context', contextRouter);
app.use('/api/citations', citationsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/document-types', documentTypesRouter);
app.use('/api/upload-defaults', uploadDefaultsRouter);

// --- Health Check Endpoint ---
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok' });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// --- Placeholder Routes ---
app.post('/analyze-solicitation', (req, res) => {
    // TODO: Implement solicitation analysis using Ollama LLM
    res.json({ message: 'Solicitation analysis placeholder' });
});

app.post('/generate-section', (req, res) => {
    // TODO: Implement section generation using Ollama LLM
    res.json({ message: 'Section generation placeholder' });
});

app.get('/search-past-performance', (req, res) => {
    // TODO: Implement past performance search using PostgreSQL
    res.json({ message: 'Past performance search placeholder' });
});

// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// --- HTTP & WebSocket Server Setup ---
const server = http.createServer(app);
const wss = new Server({ server });

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.on('message', (message) => {
        // TODO: Handle WebSocket messages, possibly interact with Ollama LLM
        ws.send(JSON.stringify({ message: 'WebSocket placeholder response' }));
    });
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

// --- Initialize Services ---
async function initializeServices() {
    try {
        // Initialize Global Prompt Configuration tables
        const globalPromptService = new GlobalPromptService();
        await globalPromptService.initializeTables();
        console.log('Global prompt configuration initialized');
    } catch (error) {
        console.error('Error initializing services:', error);
    }
}

// --- Start Server ---
server.listen(PORT, async () => {
    console.log(`Server listening on port ${PORT}`);
    await initializeServices();
});

module.exports = { app, server, pool };