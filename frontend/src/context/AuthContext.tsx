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

// Sessions end on INACTIVITY, not on a fixed clock from login: an operator part
// way through a shift was being logged out mid-task. The clock restarts on any
// interaction, so only a genuinely abandoned terminal falls out.
const SESSION_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12h with no activity
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;
// Last activity lives in localStorage so every tab shares one clock — a tab
// left idle in the background no longer expires while you work in another.
const LAST_ACTIVITY_KEY = 'nexus_last_activity';
// Renew the token well inside its lifetime so an active session never 401s.
const TOKEN_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

const markActivity = () => {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {
    /* storage full / disabled — session simply falls back to the token's own expiry */
  }
};

const readLastActivity = (): number => {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    const ts = raw ? parseInt(raw, 10) : NaN;
    if (!Number.isNaN(ts) && ts > 0) return ts;
    // No stamp yet — a fresh login, or the first load after this build reached
    // the browser. Start the idle clock NOW and persist it. Deliberately do NOT
    // fall back to the old absolute loginTime: anyone who logged in more than
    // the idle window ago would be read as "idle that whole time" and thrown
    // out on sight, which is the very behaviour this replaced.
    markActivity();
    return Date.now();
  } catch {
    return Date.now();
  }
};

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
            const currentTime = Date.now();

            if (currentTime - readLastActivity() > SESSION_TIMEOUT_MS) {
              console.log('Session expired after 12 hours of inactivity');
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

      // Double-check localStorage before redirecting — prevents logout on deploy/chunk errors
      try {
        const authData = localStorage.getItem('nexus_auth');
        const token = localStorage.getItem('nexus_token');
        if (authData && token) {
          const parsed = JSON.parse(authData);
          if (parsed.isAuthenticated && parsed.role && (Date.now() - readLastActivity()) < SESSION_TIMEOUT_MS) {
            // Auth is still valid in localStorage — restore it instead of redirecting
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
            return; // Don't redirect — user is still logged in
          }
        }
      } catch { /* localStorage error — proceed to redirect */ }

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
      localStorage.removeItem(LAST_ACTIVITY_KEY);
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
          const elapsed = Date.now() - readLastActivity();
          const remaining = SESSION_TIMEOUT_MS - elapsed;

          if (remaining <= 0) {
            // Don't auto-logout when offline — let user keep working
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
              return;
            }
            console.log('Session expired after 12 hours of inactivity - auto logout');
            toast.warning('Your session has expired. Please log in again.');
            logout();
            return;
          }

          // Any interaction pushes the deadline back, so a warned-then-resumed
          // operator must not keep the stale warning flags.
          if (remaining > FIFTEEN_MINUTES_MS) {
            warningShown15.current = false;
            warningShown5.current = false;
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

    // Check every 2 minutes — the idle window is 12h so no need for 30s checks
    const intervalId = setInterval(checkSessionExpiration, 120000);
    return () => clearInterval(intervalId);
  }, [user, logout]);

  // Record activity (throttled) so the idle clock restarts while the operator
  // is working. Stamped in localStorage, so all tabs share one deadline.
  useEffect(() => {
    if (!user) return;
    let last = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - last < 30000) return; // at most one write per 30s
      last = now;
      markActivity();
    };
    markActivity();
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'];
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
    const onVisible = () => { if (document.visibilityState === 'visible') onActivity(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  // Keep the token fresh while the session is alive. Without this an operator
  // working past the token's lifetime would start getting 401s despite the
  // idle clock saying they're still signed in.
  useEffect(() => {
    if (!user) return;
    const renew = async () => {
      try {
        const token = localStorage.getItem('nexus_token');
        if (!token) return;
        if (Date.now() - readLastActivity() > SESSION_TIMEOUT_MS) return; // idle out instead
        const res = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return; // leave the session alone; the idle check owns logout
        const data = await res.json();
        if (data?.access_token) localStorage.setItem('nexus_token', data.access_token);
      } catch {
        /* offline or transient — try again next tick */
      }
    };
    renew();
    const id = setInterval(renew, TOKEN_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user]);

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
          markActivity();
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
