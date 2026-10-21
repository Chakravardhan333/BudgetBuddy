import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Restore authenticated session on load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('budgetbuddy_access_token');
      const storedUser = localStorage.getItem('budgetbuddy_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          // Verify with backend
          const profileData = await authService.getProfile();
          const syncedUser = {
            id: profileData.id,
            username: profileData.username,
            email: profileData.email,
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            full_name: `${profileData.first_name} ${profileData.last_name}`.trim() || profileData.username,
            role: profileData.profile?.role || 'student',
            currency: profileData.profile?.currency || 'USD',
            currency_symbol: profileData.profile?.currency_symbol || '$',
            phone_number: profileData.profile?.phone_number || '',
            bio: profileData.profile?.bio || '',
            is_staff: profileData.is_staff,
            is_superuser: profileData.is_superuser,
          };
          setUser(syncedUser);
          localStorage.setItem('budgetbuddy_user', JSON.stringify(syncedUser));
        } catch {
          // Token expired or invalid
          localStorage.removeItem('budgetbuddy_access_token');
          localStorage.removeItem('budgetbuddy_refresh_token');
          localStorage.removeItem('budgetbuddy_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();

    const handleLogoutEvent = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, []);

  const login = async (username, password) => {
    setAuthError(null);
    try {
      const data = await authService.login({ username, password });
      localStorage.setItem('budgetbuddy_access_token', data.access);
      localStorage.setItem('budgetbuddy_refresh_token', data.refresh);
      localStorage.setItem('budgetbuddy_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      let message = 'Invalid username or password. Please try again.';

      if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout')) {
        message = 'Connection timed out. The backend server may be waking up (Render free tier). Please wait a moment and try again.';
      } else if (!err.response) {
        message = 'Cannot connect to the backend service. Please check your network connection and verify that the backend API is running.';
      } else if (err.response.status >= 500) {
        message = `Backend server error (${err.response.status}). Please try again shortly or check backend service logs.`;
      } else if (err.response.data?.detail) {
        message = err.response.data.detail;
      } else if (err.response.data?.non_field_errors?.[0]) {
        message = err.response.data.non_field_errors[0];
      } else if (typeof err.response.data === 'object') {
        const firstKey = Object.keys(err.response.data)[0];
        if (firstKey) {
          const val = err.response.data[firstKey];
          message = Array.isArray(val) ? `${firstKey}: ${val[0]}` : `${firstKey}: ${val}`;
        }
      }

      setAuthError(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    setAuthError(null);
    try {
      const data = await authService.register(userData);
      localStorage.setItem('budgetbuddy_access_token', data.access);
      localStorage.setItem('budgetbuddy_refresh_token', data.refresh);
      localStorage.setItem('budgetbuddy_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      let message = 'Registration failed. Please check the fields and try again.';
      let fieldErrors = {};

      if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout')) {
        message = 'Connection timed out. The backend server may be waking up (Render free tier). Please wait a moment and try again.';
      } else if (!err.response) {
        message = 'Cannot connect to the backend service. Please check your network connection and verify that the backend API is running.';
      } else if (err.response.status >= 500) {
        message = err.response.data?.detail || `Backend server error (${err.response.status}). Please try again later or check backend service logs.`;
      } else if (err.response.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          message = errorData;
        } else if (typeof errorData === 'object') {
          fieldErrors = errorData;
          if (errorData.detail) {
            message = errorData.detail;
          } else {
            const errorList = [];
            for (const [key, val] of Object.entries(errorData)) {
              const label = key.replace(/_/g, ' ');
              const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
              const errorText = Array.isArray(val) ? val.join(' ') : String(val);
              errorList.push(`${capitalizedLabel}: ${errorText}`);
            }
            if (errorList.length > 0) {
              message = errorList.join(' • ');
            }
          }
        }
      }

      setAuthError(message);
      return { success: false, error: message, errors: fieldErrors };
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateUserProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);
      const updatedUser = response.user;
      const formatted = {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        full_name: `${updatedUser.first_name} ${updatedUser.last_name}`.trim() || updatedUser.username,
        role: updatedUser.profile?.role || user.role,
        currency: updatedUser.profile?.currency || user.currency,
        currency_symbol: updatedUser.profile?.currency_symbol || user.currency_symbol,
        phone_number: updatedUser.profile?.phone_number || '',
        bio: updatedUser.profile?.bio || '',
        is_staff: updatedUser.is_staff,
        is_superuser: updatedUser.is_superuser,
      };
      setUser(formatted);
      localStorage.setItem('budgetbuddy_user', JSON.stringify(formatted));
      return { success: true, user: formatted };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data || 'Failed to update profile details.',
      };
    }
  };

  const changePassword = async (oldPassword, newPassword, confirmPassword) => {
    try {
      await authService.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
      return { success: true };
    } catch (err) {
      const errData = err.response?.data || {};
      let msg = 'Failed to change password.';
      if (errData.old_password) msg = errData.old_password[0];
      else if (errData.new_password) msg = errData.new_password[0];
      else if (errData.new_password_confirm) msg = errData.new_password_confirm[0];
      return { success: false, error: msg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        authError,
        setAuthError,
        login,
        register,
        logout,
        updateUserProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
