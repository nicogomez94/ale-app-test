import { ThemeOptions } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark'): ThemeOptions => {
  return {
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#1a237e' : '#8c9eff',
        light: mode === 'light' ? '#534bae' : '#b6c2ff',
        dark: mode === 'light' ? '#000051' : '#536dfe',
        contrastText: mode === 'light' ? '#ffffff' : '#101326',
      },
      secondary: {
        main: '#00c853',
      },
      info: {
        main: '#1A96D4',
      },
      background: {
        default: mode === 'light' ? '#f5f7fb' : '#0a0a0a',
        paper: mode === 'light' ? '#ffffff' : '#121212',
      },
    },
    typography: {
      fontFamily: '"Manrope", sans-serif',
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
      MuiTable: {
        styleOverrides: {
          root: {
            borderCollapse: 'separate',
            borderSpacing: '0 16px',
            backgroundColor: mode === 'light' ? '#f5f7fb' : '#0a0a0a',
            '& > tbody > tr:not([data-detail-row])': {
              backgroundColor: mode === 'light' ? '#ffffff' : '#181818',
            },
            '& > tbody > tr:not([data-detail-row]) > td': {
              borderTop: `2px solid ${mode === 'light' ? '#303030' : '#666'}`,
              borderBottom: `2px solid ${mode === 'light' ? '#303030' : '#666'}`,
              '&:first-of-type': { borderLeft: '5px solid', borderLeftColor: 'inherit', borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
              '&:last-of-type': { borderRight: `2px solid ${mode === 'light' ? '#303030' : '#666'}`, borderTopRightRadius: 8, borderBottomRightRadius: 8 },
            },
            '& > tbody > tr[data-detail-row] > td': { border: 0 },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: 999,
            paddingLeft: 18,
            paddingRight: 18,
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            backgroundColor: mode === 'light' ? '#f5f7fb' : '#0a0a0a',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: mode === 'light' ? '0 8px 24px rgba(27,37,91,0.06)' : '0 4px 12px rgba(0,0,0,0.5)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            '&.MuiTableContainer-root': {
              borderRadius: '8px',
              backgroundColor: mode === 'light' ? '#f5f7fb' : '#0a0a0a',
            },
          },
        },
      },
    },
  };
};
