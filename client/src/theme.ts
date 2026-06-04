import { ThemeOptions } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark'): ThemeOptions => {
  const isDark = mode === 'dark';

  return {
    palette: {
      mode,
      primary: {
        main: isDark ? '#0f8a7d' : '#00453D',
        light: isDark ? '#41c7ba' : '#2AB7A9',
        dark: isDark ? '#0a5c54' : '#002d27',
      },
      secondary: {
        main: isDark ? '#39bfb2' : '#2AB7A9',
        light: isDark ? '#6fddd4' : '#4ECDC4',
        dark: isDark ? '#208d83' : '#1e9387',
      },
      info: {
        main: '#1A96D4',
      },
      background: {
        default: isDark ? '#0a0f0e' : '#f4fbf9',
        paper: isDark ? '#121a18' : '#ffffff',
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
  };
};
