const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Use backend service name in Docker, localhost for local development
  const target = process.env.REACT_APP_API_URL || 'http://backend:3001';

  app.use(
    '/api',
    createProxyMiddleware({
      target: target,
      changeOrigin: true,
      logLevel: 'debug'
    })
  );
};