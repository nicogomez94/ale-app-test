import { ThemeOptions } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: '#00453D',
      light: '#2AB7A9',
      dark: '#002d27',
    },
    secondary: {
      main: '#2AB7A9',
      light: '#4ECDC4',
      dark: '#1e9387',
    },
    info: {
      main: '#1A96D4',
    },
    background: {
      default: mode === 'light' ? '#f4fbf9' : '#0a0f0e',
      paper: mode === 'light' ? '#ffffff' : '#121a18',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: mode === 'light' ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 12px rgba(0,0,0,0.5)',
        },
      },
    },
  },
});
