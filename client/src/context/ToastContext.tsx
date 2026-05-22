import React, { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Snackbar, Alert, type AlertColor } from '@mui/material';

interface ToastOptions {
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, severity?: AlertColor, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastState {
  open: boolean;
  message: string;
  severity: AlertColor;
  duration: number;
}

const DEFAULT_DURATION = 5000;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: '',
    severity: 'success',
    duration: DEFAULT_DURATION,
  });

  const showToast = useCallback<ToastContextType['showToast']>((message, severity = 'success', options) => {
    setToast({
      open: true,
      message,
      severity,
      duration: options?.duration ?? DEFAULT_DURATION,
    });
  }, []);

  const handleClose = (_event?: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={toast.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
