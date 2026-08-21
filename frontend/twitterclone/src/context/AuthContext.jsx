import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../api/authApi";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is currently authenticated via /api/auth/me
  const checkAuth = async () => {
    try {
      setLoading(true);
      const data = await authApi.getMe();
      if (data && data.success && data.data) {
        setAuthUser(data.data);
      } else {
        setAuthUser(null);
      }
    } catch {
      setAuthUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);
    if (!data || !data.success) {
      throw new Error(data?.message || "Failed to log in");
    }
    setAuthUser(data.data);
    return data.data;
  };

  const signup = async (userData) => {
    const data = await authApi.signup(userData);
    if (!data || !data.success) {
      throw new Error(data?.message || "Failed to sign up");
    }
    setAuthUser(data.data);
    return data.data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setAuthUser(null);
    }
  };

  const updateUserInContext = (updatedFields) => {
    setAuthUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        setAuthUser,
        loading,
        login,
        signup,
        logout,
        checkAuth,
        updateUserInContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
