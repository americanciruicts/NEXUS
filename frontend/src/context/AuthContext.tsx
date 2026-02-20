'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/config/api';

interface User {
  id?: number;
  username: string;
  email?: string;
  first_name?: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'VIEWER';
  isApprover: boolean;
  isItar?: boolean;
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
            // Check if 8 hours have passed since login (matching backend token expiration)
            const loginTime = parsed.loginTime || 0;
            const currentTime = Date.now();
            const eightHoursInMs = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

            if (currentTime - loginTime > eightHoursInMs) {
              // 8 hours have passed, logout automatically
              console.log('Session expired after 8 hours');
              localStorage.removeItem('nexus_auth');
              localStorage.removeItem('nexus_token');
              setUser(null);
            } else {
              setUser({
                username: parsed.username,
                first_name: parsed.first_name,
                role: parsed.role,
                isApprover: parsed.isApprover || false
              });
            }
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
    // Redirect to login if not authenticated and not on login or SSO callback page
    if (!isLoading && !user && pathname !== '/auth/login' && !pathname.startsWith('/sso/')) {
      router.push('/auth/login');
    }
  }, [user, isLoading, pathname, router]);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem('nexus_auth');
      localStorage.removeItem('nexus_token');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      // Continue with logout even if localStorage fails
    }
    router.push('/auth/login');
  }, [router]);

  useEffect(() => {
    // Periodic check for session expiration (every minute)
    const checkSessionExpiration = () => {
      try {
        const authData = localStorage.getItem('nexus_auth');
        if (authData && user) {
          const parsed = JSON.parse(authData);
          const loginTime = parsed.loginTime || 0;
          const currentTime = Date.now();
          const eightHoursInMs = 8 * 60 * 60 * 1000; // 8 hours in milliseconds (matching backend)

          if (currentTime - loginTime > eightHoursInMs) {
            // 8 hours have passed, logout automatically
            console.log('Session expired after 8 hours - auto logout');
            toast.warning('Your session has expired after 8 hours. Please log in again.');
            logout();
          }
        }
      } catch (error) {
        console.error('Error checking session expiration:', error);
      }
    };

    // Check every minute (60000ms)
    const intervalId = setInterval(checkSessionExpiration, 60000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [user, logout]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Call backend API to authenticate and get JWT token
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        const accessToken = data.access_token;
        const backendUser = data.user;

        const userData: User = {
          id: backendUser.id,
          username: backendUser.username,
          email: backendUser.email,
          first_name: backendUser.first_name,
          role: backendUser.role,
          isApprover: backendUser.is_approver
        };

        setUser(userData);

        // Store token and user info in localStorage with error handling
        try {
          localStorage.setItem('nexus_token', accessToken);
          localStorage.setItem('nexus_auth', JSON.stringify({
            username: userData.username,
            first_name: userData.first_name,
            role: userData.role,
            isApprover: userData.isApprover,
            isAuthenticated: true,
            loginTime: Date.now()
          }));
        } catch (error) {
          console.error('Error saving to localStorage:', error);
          // Continue even if localStorage fails - user will need to login again on refresh
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
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