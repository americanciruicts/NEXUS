'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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

const SESSION_TIMEOUT_MS = 14 * 60 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const warningShown15 = useRef(false);
  const warningShown5 = useRef(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const authData = localStorage.getItem('nexus_auth');
        if (authData) {
          const parsed = JSON.parse(authData);
          if (parsed.isAuthenticated && parsed.role) {
            const loginTime = parsed.loginTime || 0;
            const currentTime = Date.now();

            if (currentTime - loginTime > SESSION_TIMEOUT_MS) {
              console.log('Session expired after 14 hours');
              localStorage.removeItem('nexus_auth');
              localStorage.removeItem('nexus_token');
              setUser(null);
            } else {
              const derivedFirstName = parsed.first_name || (parsed.username?.includes('@') ? parsed.username.split('@')[0].charAt(0).toUpperCase() + parsed.username.split('@')[0].slice(1) : parsed.username);
              setUser({
                id: parsed.id,
                username: parsed.username,
                email: parsed.email,
                first_name: derivedFirstName,
                role: parsed.role,
                isApprover: parsed.isApprover || false,
                isItar: parsed.isItar || false
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
    if (!isLoading && !user && pathname !== '/auth/login' && !pathname.startsWith('/sso/')) {
      // If offline, don't redirect — let user browse cached pages
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return;
      }
      // Detect if we're on local network
      const isLocal = typeof window !== 'undefined' && (
        window.location.hostname.includes('.local') ||
        window.location.hostname.startsWith('192.168.') ||
        window.location.hostname === 'localhost'
      );
      // Redirect to FORGE login with redirect param so user comes back after login
      const forgeLoginUrl = isLocal
        ? 'http://acidashboard.aci.local:2005/login?redirect=nexus'
        : 'https://aci-forge.vercel.app/login?redirect=nexus';
      window.location.href = forgeLoginUrl;
    }
  }, [user, isLoading, pathname, router]);

  const logout = useCallback(() => {
    setUser(null);
    warningShown15.current = false;
    warningShown5.current = false;
    try {
      localStorage.removeItem('nexus_auth');
      localStorage.removeItem('nexus_token');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
    // Redirect to FORGE login with redirect param
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname.includes('.local') ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname === 'localhost'
    );
    const forgeLoginUrl = isLocal
      ? 'http://acidashboard.aci.local:2005/login?redirect=nexus'
      : 'https://aci-forge.vercel.app/login?redirect=nexus';
    window.location.href = forgeLoginUrl;
  }, [router]);

  useEffect(() => {
    const checkSessionExpiration = () => {
      try {
        const authData = localStorage.getItem('nexus_auth');
        if (authData && user) {
          const parsed = JSON.parse(authData);
          const loginTime = parsed.loginTime || 0;
          const elapsed = Date.now() - loginTime;
          const remaining = SESSION_TIMEOUT_MS - elapsed;

          if (remaining <= 0) {
            // Don't auto-logout when offline — let user keep working
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
              return;
            }
            console.log('Session expired after 14 hours - auto logout');
            toast.warning('Your session has expired. Please log in again.');
            logout();
            return;
          }

          // 15-minute warning
          if (remaining <= FIFTEEN_MINUTES_MS && !warningShown15.current) {
            warningShown15.current = true;
            const mins = Math.ceil(remaining / 60000);
            toast.warning(`Session expiring in ${mins} minutes. Save your work.`, {
              duration: 10000,
            });
          }

          // 5-minute warning
          if (remaining <= FIVE_MINUTES_MS && !warningShown5.current) {
            warningShown5.current = true;
            const mins = Math.ceil(remaining / 60000);
            toast.error(`Session expiring in ${mins} minutes! Save your work now.`, {
              duration: 15000,
            });
          }
        }
      } catch (error) {
        console.error('Error checking session expiration:', error);
      }
    };

    // Check every 30 seconds
    const intervalId = setInterval(checkSessionExpiration, 30000);
    return () => clearInterval(intervalId);
  }, [user, logout]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(10000)
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
        warningShown15.current = false;
        warningShown5.current = false;

        try {
          localStorage.setItem('nexus_token', accessToken);
          localStorage.setItem('nexus_auth', JSON.stringify({
            id: userData.id,
            username: userData.username,
            email: userData.email,
            first_name: userData.first_name,
            role: userData.role,
            isApprover: userData.isApprover,
            isItar: userData.isItar,
            isAuthenticated: true,
            loginTime: Date.now()
          }));
        } catch (error) {
          console.error('Error saving to localStorage:', error);
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
