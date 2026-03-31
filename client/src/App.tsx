import { useState, useMemo, Component, ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Alert, Button } from '@mui/material';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Error: {(this.state.error as Error).message}
          </Alert>
          <Button variant="outlined" onClick={() => this.setState({ error: null })}>Reintentar</Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
import { getTheme } from './theme';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/DashboardPage';
import { PolicyForm } from './pages/PolicyForm';
import { ReferralPage } from './pages/ReferralPage';
import { PaymentPage } from './pages/PaymentPage';
import { ClientsPage } from './pages/ClientsPage';
import { CommissionsPage } from './pages/CommissionsPage';
import { ProfilePage } from './pages/ProfilePage';
import { CompaniesPage } from './pages/CompaniesPage';
import { LifeAndFinancePage } from './pages/LifeAndFinancePage';

export default function App() {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const theme = useMemo(() => createTheme(getTheme(isDarkMode ? 'dark' : 'light')), [isDarkMode]);

  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout
          user={user}
          onLogout={logout}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        >
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<ClientsPage />} />
            <Route path="/empresas" element={<CompaniesPage />} />
            <Route path="/vida-finanzas" element={<LifeAndFinancePage />} />
            <Route path="/polizas" element={<PolicyForm />} />
            <Route path="/comisiones" element={<CommissionsPage />} />
            <Route path="/referidos" element={<ReferralPage />} />
            <Route path="/pagos" element={<PaymentPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </ErrorBoundary>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}
