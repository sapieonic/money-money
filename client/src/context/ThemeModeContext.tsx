import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme, type ThemeMode } from '../theme/theme';
import { settingsService } from '../services/settingsService';
import { useAuth } from './AuthContext';

interface ThemeModeContextType {
  mode: ThemeMode;
  toggleMode: () => void;
}

const STORAGE_KEY = 'fw-theme-mode';

const ThemeModeContext = createContext<ThemeModeContextType | undefined>(undefined);

const readInitialMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<ThemeMode>(readInitialMode);

  // Hydrate from server preference once the user is authenticated
  useEffect(() => {
    if (!user) return;
    settingsService
      .get()
      .then((settings) => {
        if (settings.theme && settings.theme !== mode) {
          setMode(settings.theme);
          window.localStorage.setItem(STORAGE_KEY, settings.theme);
        }
      })
      .catch(() => {
        // ignore — fall back to local/system preference
      });
    // run once per user change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleMode = () => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      window.localStorage.setItem(STORAGE_KEY, next);
      if (user) {
        settingsService.update({ theme: next }).catch(() => {
          // non-fatal: keep local preference even if server update fails
        });
      }
      return next;
    });
  };

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = (): ThemeModeContextType => {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
};
