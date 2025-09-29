import React, { useState, useEffect } from 'react';

const Login = ({ onLogin }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockCredentials, setMockCredentials] = useState({
    email: 'admin@mock.local',
    role: 'admin'
  });

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Check for OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authError = urlParams.get('error');
    const status = urlParams.get('status');

    if (authError === 'auth_failed') {
      setError('Authentication failed. Please try again.');
    } else if (authError === 'callback_failed') {
      setError('OAuth callback failed. Please try again.');
    } else if (status === 'pending_approval') {
      setError('Your account is pending admin approval. Please contact your administrator.');
    }

    // Clear URL parameters
    if (authError || status) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Check if already authenticated
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        onLogin(data.data);
      } else if (response.status !== 401) {
        // Only log non-401 errors, as 401 is expected when not authenticated
        console.log('Auth check failed with status:', response.status);
      }
    } catch (error) {
      console.log('Not authenticated:', error.message);
    }
  };

  const handleGoogleLogin = () => {
    setError('');
    setLoading(true);
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  const handleMicrosoftLogin = () => {
    setError('');
    setLoading(true);
    window.location.href = `${apiUrl}/api/auth/microsoft`;
  };

  const handleMockLogin = async () => {
    if (!mockCredentials.email) {
      setError('Email is required for mock authentication');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/api/auth/mock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(mockCredentials)
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.data);
      } else {
        setError(data.message || 'Mock authentication failed');
      }
    } catch (error) {
      setError('Failed to connect to authentication service');
    } finally {
      setLoading(false);
    }
  };

  const handleLegacyLogin = async () => {
    // Support for existing simulate-login endpoint
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/api/auth/simulate-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username: mockCredentials.email })
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.data);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Failed to connect to authentication service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f5f5f5',
      backgroundImage: 'url("/topographic.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      overflow: 'hidden'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.5)',
        padding: '3rem 2.5rem',
        width: '100%',
        maxWidth: '450px',
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        {/* Logo and Title */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #6b7280, #374151)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '2rem',
            color: 'white',
            boxShadow: '0 10px 25px rgba(107, 114, 128, 0.3)'
          }}>
            🏛️
          </div>
          <h1 style={{
            fontSize: '1.8rem',
            fontWeight: '700',
            color: '#2d3748',
            margin: '0 0 0.5rem'
          }}>
            nxtProposal
          </h1>
          <p style={{
            color: '#718096',
            fontSize: '1rem',
            margin: 0
          }}>
            Sign in to access your workspace
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fed7d7',
            border: '1px solid #feb2b2',
            color: '#c53030',
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {/* OAuth Buttons */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={handleMicrosoftLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem 1.25rem',
              background: '#0078d4',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => !loading && (e.target.style.background = '#106ebe')}
            onMouseOut={(e) => !loading && (e.target.style.background = '#0078d4')}
          >
            <svg width="18" height="18" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="12" y="1" width="9" height="9" fill="#00a4ef"/>
              <rect x="1" y="12" width="9" height="9" fill="#00a4ef"/>
              <rect x="12" y="12" width="9" height="9" fill="#ffb900"/>
            </svg>
            Sign in with Microsoft
          </button>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem 1.25rem',
              background: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => !loading && (e.target.style.background = '#3367d6')}
            onMouseOut={(e) => !loading && (e.target.style.background = '#4285f4')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </div>

        {/* Development Section */}
        <div style={{
          borderTop: '1px solid #e2e8f0',
          paddingTop: '1.5rem',
          marginTop: '1.5rem'
        }}>
          <p style={{
            color: '#718096',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            fontWeight: '500'
          }}>
            Development Mode
          </p>

          {/* Mock Authentication Form */}
          <div style={{
            background: '#f7fafc',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1rem'
          }}>
            <input
              type="email"
              placeholder="Email address"
              value={mockCredentials.email}
              onChange={(e) => setMockCredentials({ ...mockCredentials, email: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d2d6dc',
                borderRadius: '4px',
                fontSize: '0.875rem',
                marginBottom: '0.5rem',
                boxSizing: 'border-box'
              }}
            />
            <select
              value={mockCredentials.role}
              onChange={(e) => setMockCredentials({ ...mockCredentials, role: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d2d6dc',
                borderRadius: '4px',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            >
              <option value="admin">Administrator</option>
              <option value="proposal_lead">Proposal Lead</option>
              <option value="solutions_architect">Solutions Architect</option>
              <option value="writer">Writer</option>
              <option value="business_development">Business Development</option>
              <option value="reviewer">Reviewer</option>
              <option value="subject_matter_expert">Subject Matter Expert</option>
            </select>
          </div>

          <button
            onClick={handleMockLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#38a169',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '0.5rem',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => !loading && (e.target.style.background = '#2f855a')}
            onMouseOut={(e) => !loading && (e.target.style.background = '#38a169')}
          >
            {loading ? 'Signing in...' : 'Mock Sign In'}
          </button>

          <button
            onClick={handleLegacyLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => !loading && (e.target.style.background = '#1f2937')}
            onMouseOut={(e) => !loading && (e.target.style.background = '#374151')}
          >
            Legacy Login
          </button>
        </div>

        {/* Footer */}
        <p style={{
          color: '#a0aec0',
          fontSize: '0.75rem',
          marginTop: '2rem',
          marginBottom: 0
        }}>
          Secure authentication powered by OAuth 2.0
        </p>
      </div>
    </div>
  );
};

export default Login;