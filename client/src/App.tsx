import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProjectList } from './routes/ProjectList';
import { ProjectDetail } from './routes/ProjectDetail';
import { FindingDetail } from './routes/FindingDetail';
import { TrendChartPage } from './routes/TrendChartPage';
import { Settings } from './routes/Settings';
import { Login } from './routes/Login';
import { checkAuth } from './lib/api';
import { colors, fontFamily } from './lib/theme';

/* ---------- Toast system ---------- */

type ToastFn = (message: string) => void;
const ToastContext = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

interface ToastItem {
  id: number;
  message: string;
  leaving: boolean;
}

let toastId = 0;

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, leaving: false }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    }, 1700);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: 8,
              padding: '8px 16px',
              color: '#F3F4F6',
              fontSize: 12,
              fontFamily: "'Figtree', sans-serif",
              animation: t.leaving
                ? 'toast-slide-out 0.3s ease-in forwards'
                : 'toast-slide-in 0.3s ease-out',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------- Auth gate ---------- */

type AuthState = 'loading' | 'authed' | 'unauthed';

function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('loading');

  useEffect(() => {
    let cancelled = false;
    checkAuth().then((ok) => {
      if (!cancelled) setState(ok ? 'authed' : 'unauthed');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = (): void => setState('unauthed');
    window.addEventListener('tenet:unauthenticated', handler);
    return () => window.removeEventListener('tenet:unauthenticated', handler);
  }, []);

  if (state === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: colors.base,
          color: colors.textMuted,
          fontFamily: fontFamily.sans,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
        }}
      >
        Loading…
      </div>
    );
  }

  if (state === 'unauthed') {
    return <Login onAuthenticated={() => setState('authed')} />;
  }

  return <>{children}</>;
}

/* ---------- App ---------- */

export function App() {
  return (
    <ToastProvider>
      <AuthGate>
        <div style={{ minHeight: '100vh', backgroundColor: '#030712' }}>
          <Routes>
            <Route path="/" element={<ProjectList />} />
            <Route path="/p/:slug" element={<ProjectDetail />} />
            <Route path="/p/:slug/f/:findingId" element={<FindingDetail />} />
            <Route path="/p/:slug/trends" element={<TrendChartPage />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </AuthGate>
    </ToastProvider>
  );
}
