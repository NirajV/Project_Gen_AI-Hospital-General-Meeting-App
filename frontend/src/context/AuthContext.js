import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('auth_token'));

    const checkAuth = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/api/auth/me`, {
                withCredentials: true,
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setUser(response.data);
        } catch (error) {
            setUser(null);
            setToken(null);
            localStorage.removeItem('auth_token');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = async (email, password) => {
        const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
        const { access_token, user: userData } = response.data;
        setToken(access_token);
        localStorage.setItem('auth_token', access_token);
        setUser(userData);
        return userData;
    };

    const register = async (userData) => {
        const response = await axios.post(`${API_URL}/api/auth/register`, userData);
        const { access_token, user: newUser } = response.data;
        setToken(access_token);
        localStorage.setItem('auth_token', access_token);
        setUser(newUser);
        return newUser;
    };

    const processOAuthSession = async (sessionId) => {
        const response = await axios.post(
            `${API_URL}/api/auth/session`,
            { session_id: sessionId },
            { withCredentials: true }
        );
        const { user: userData, session_token } = response.data;
        setToken(session_token);
        localStorage.setItem('auth_token', session_token);
        setUser(userData);
        return userData;
    };

    const logout = async () => {
        try {
            await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
        } catch (e) {
            // Ignore logout errors
        }
        setUser(null);
        setToken(null);
        localStorage.removeItem('auth_token');
    };

    const getAuthHeader = () => {
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            token,
            login,
            register,
            logout,
            processOAuthSession,
            getAuthHeader,
            checkAuth,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
