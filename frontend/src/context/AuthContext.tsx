'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id?: number;
  username: string;
  email?: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'VIEWER';
  isApprover: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check for existing authentication on mount
    const checkAuth = () => {
      try {
        const authData = localStorage.getItem('nexus_auth');
        if (authData) {
          const parsed = JSON.parse(authData);
          if (parsed.isAuthenticated && parsed.role) {
            setUser({
              username: parsed.username,
              role: parsed.role,
              isApprover: parsed.isApprover || false
            });
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        localStorage.removeItem('nexus_auth');
        localStorage.removeItem('nexus_token');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    // Redirect to login if not authenticated and not on login page
    if (!isLoading && !user && pathname !== '/auth/login') {
      router.push('/auth/login');
    }
  }, [user, isLoading, pathname, router]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Call backend API to authenticate and get JWT token
      const response = await fetch('http://acidashboard.aci.local:100/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      if (response.ok) {
        const data = await response.json();
        const accessToken = data.access_token;
        const backendUser = data.user;

        const userData: User = {
          id: backendUser.id,
          username: backendUser.username,
          email: backendUser.email,
          role: backendUser.role,
          isApprover: backendUser.is_approver
        };

        setUser(userData);

        // Store token and user info in localStorage
        localStorage.setItem('nexus_token', accessToken);
        localStorage.setItem('nexus_auth', JSON.stringify({
          username: userData.username,
          role: userData.role,
          isApprover: userData.isApprover,
          isAuthenticated: true,
          loginTime: Date.now()
        }));

        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nexus_auth');
    localStorage.removeItem('nexus_token');
    router.push('/auth/login');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}