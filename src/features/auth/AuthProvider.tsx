import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Profile } from '../../domain/model';
import { api, client, configured } from '../../services/backend';
import { expired } from './session';
interface AuthState {
  profile: Profile | null;
  loading: boolean;
  login: (data: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
}
const Context = createContext<AuthState | null>(null);
const activityKey = 'estoque.lastActivity';
export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const last = useRef(Number(sessionStorage.getItem(activityKey)) || 0);
  const touched = useRef(0);
  const clear = useCallback(() => {
    setProfile(null);
    sessionStorage.removeItem(activityKey);
  }, []);
  const logout = useCallback(async () => {
    clear();
    try {
      if (configured) await api.logout();
    } catch {
      /* local credentials already discarded; backend enforces idle timeout */
    }
  }, [clear]);
  const login = useCallback(
    async (data: Record<string, unknown>) => {
      await api.login(data);
      const current = await api.profile();
      if (!current?.id) {
        await logout();
        throw new Error('AUTH_FAILED');
      }
      last.current = Date.now();
      touched.current = last.current;
      sessionStorage.setItem(activityKey, String(last.current));
      setProfile(current);
    },
    [logout],
  );
  useEffect(() => {
    let live = true;
    async function restore() {
      if (!client) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await client.auth.getSession();
        if (data.session && !expired(last.current)) {
          const current = await api.profile();
          if (live) setProfile(current?.id ? current : null);
        } else if (data.session) await logout();
      } catch {
        if (live) clear();
      } finally {
        if (live) setLoading(false);
      }
    }
    void restore();
    const subscription = client?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') clear();
    });
    return () => {
      live = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, [clear, logout]);
  useEffect(() => {
    if (!profile) return;
    let inFlight = false;
    const activity = () => {
      if (expired(last.current)) {
        void logout();
        return;
      }
      last.current = Date.now();
      sessionStorage.setItem(activityKey, String(last.current));
      if (Date.now() - touched.current > 15000 && !inFlight) {
        inFlight = true;
        void api
          .touch()
          .then(() => {
            touched.current = Date.now();
          })
          .catch(() => logout())
          .finally(() => {
            inFlight = false;
          });
      }
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'hashchange'];
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    const timer = window.setInterval(() => {
      if (expired(last.current)) void logout();
    }, 1000);
    const focus = () => {
      if (expired(last.current)) void logout();
    };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    return () => {
      events.forEach((event) => window.removeEventListener(event, activity));
      clearInterval(timer);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [profile, logout]);
  return (
    <Context.Provider value={{ profile, loading, login, logout }}>{children}</Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider required');
  return value;
}
