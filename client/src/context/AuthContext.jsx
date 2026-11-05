import {  createContext, useCallback, useContext, useEffect, useState} from "react";

import api from "../services/api";
import { disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const response = await api.get("/auth/me");
            setUser(response.data.user);
            return response.data.user;
        } catch {
            setUser(null);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    const login = async (email, password) => {
        const response = await api.post("/auth/login", {
            email,
            password
        });

        setUser(response.data.user);
        return response.data.user;
    };

    const register = async (username, email, password) => {
        const response = await api.post("/auth/register", {
            username,
            email,
            password
        });

        setUser(response.data.user);
        return response.data.user;
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } finally {
            disconnectSocket();
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
                refreshUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
};