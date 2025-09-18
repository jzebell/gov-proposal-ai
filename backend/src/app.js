const express = require('express');
const http = require('http');
const { Server } = require('ws');
const cors = require('cors');
const { Pool } = require('pg');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const documentsRouter = require('./routes/documents');
const analysisRouter = require('./routes/analysis');

/**
 * Basic Express.js app with WebSocket, PostgreSQL, and Ollama LLM integration.
 */


// --- Configuration ---
const PORT = process.env.PORT || 3000;
const PG_CONFIG = {
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/dbname',
};
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// --- PostgreSQL Pool ---
const pool = new Pool(PG_CONFIG);

// --- Express App Setup ---
const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use('/api/documents', documentsRouter);
app.use('/api/analysis', analysisRouter);

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

// --- Start Server ---
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

module.exports = { app, server, pool };