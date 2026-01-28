import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange, signInWithGoogle, signOut, getIdToken } from '../services/firebase';
import { setTelemetryUser, clearTelemetryUser } from '../telemetry';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);

      // Update telemetry user context
      if (user) {
        setTelemetryUser(user.uid, user.email, user.displayName);
      } else {
        clearTelemetryUser();
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut();
      clearTelemetryUser();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const getToken = async () => {
    return getIdToken();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
