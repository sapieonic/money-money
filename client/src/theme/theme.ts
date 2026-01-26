import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

// Custom colors for specific categories
export const categoryColors = {
  income: '#4caf50',
  expenses: '#f44336',
  sip: '#2196f3',
  voluntary: '#9c27b0',
  assets: '#ff9800',
  remaining: '#00bcd4',
  tax: '#e91e63',
};

export const expenseCategoryColors: Record<string, string> = {
  housing: '#e57373',
  transport: '#64b5f6',
  utilities: '#81c784',
  subscriptions: '#ffb74d',
  loan: '#ba68c8',
  other: '#90a4ae',
};

export const assetCategoryColors: Record<string, string> = {
  stocks: '#4caf50',
  mutual_fund: '#2196f3',
  crypto: '#ff9800',
  fd: '#9c27b0',
  real_estate: '#795548',
  rsu: '#00bcd4',
  other: '#607d8b',
};

export const dailyExpenseCategoryColors: Record<string, string> = {
  food: '#ff7043',
  groceries: '#66bb6a',
  entertainment: '#ab47bc',
  shopping: '#42a5f5',
  travel: '#26a69a',
  health: '#ef5350',
  personal: '#ffca28',
  other: '#78909c',
};
