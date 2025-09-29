import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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
        setUser(data.data);
        setIsAuthenticated(true);
      } else {
        // 401 is expected when not authenticated - don't log as error
        if (response.status !== 401) {
          console.log('Auth check failed with status:', response.status);
        }
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.log('Auth check failed:', error.message);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const refreshAuth = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        await checkAuthStatus();
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    return false;
  };

  // Helper function to check permissions
  const hasPermission = (resource, action) => {
    if (!user || !user.permissions) return false;

    const resourcePerms = user.permissions[resource];
    if (!resourcePerms) return false;

    return resourcePerms[action] === true;
  };

  // Helper function to check role level
  const hasRoleLevel = (requiredLevel) => {
    return user && user.roleLevel >= requiredLevel;
  };

  // Helper function to check if user is admin
  const isAdmin = () => {
    return user && (user.role === 'admin' || user.roleName === 'admin');
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshAuth,
    checkAuthStatus,
    hasPermission,
    hasRoleLevel,
    isAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;