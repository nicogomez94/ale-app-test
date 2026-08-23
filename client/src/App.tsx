import { useState, useEffect, useMemo, Component, ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Alert, Button, Card, Typography } from '@mui/material';
import { api } from './api';
import { getTheme } from './theme';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/DashboardPage';
import { PolicyForm } from './pages/PolicyForm';
import { PolicyImportPage } from './pages/PolicyImportPage';
import { ReferralPage } from './pages/ReferralPage';
import { PaymentPage } from './pages/PaymentPage';
import { ClientsPage } from './pages/ClientsPage';
import { BillingPage } from './pages/BillingPage';
import { ProfilePage } from './pages/ProfilePage';
import { CompaniesPage } from './pages/CompaniesPage';
import { LifeAndFinancePage } from './pages/LifeAndFinancePage';
import { AdminPage } from './pages/AdminPage';
import { SiniestrosPage } from './pages/SiniestrosPage';
import { CotizacionesPage } from './pages/CotizacionesPage';
import { CotizacionPublicaPage } from './pages/CotizacionPublicaPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { ToolsPage } from './pages/ToolsPage';
import { SuggestionsPage } from './pages/SuggestionsPage';

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

function AppSystem() {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [subscriptionWarning, setSubscriptionWarning] = useState<{ show: boolean; diasRestantes: number }>({ show: false, diasRestantes: 0 });
  const location = useLocation();
  const navigate = useNavigate();

  const theme = useMemo(() => createTheme(getTheme(isDarkMode ? 'dark' : 'light')), [isDarkMode]);
  const isSubscriptionPage = location.pathname === '/pagos';

  useEffect(() => {
    if (!isAuthenticated) {
      setSubscriptionExpired(false);
      setSubscriptionWarning({ show: false, diasRestantes: 0 });
      return;
    }

    if (user?.isAdmin) {
      setSubscriptionExpired(false);
      setSubscriptionWarning({ show: false, diasRestantes: 0 });
      return;
    }

    if (isSubscriptionPage) {
      setSubscriptionExpired(false);
      return;
    }

    api.subscriptions.current().then((sub: any) => {
      if (sub.accesoBloqueado) {
        setSubscriptionExpired(true);
      } else if (sub.diasRestantes !== undefined && sub.diasRestantes <= 5 && sub.diasRestantes > 0) {
        setSubscriptionWarning({ show: true, diasRestantes: sub.diasRestantes });
      }
    }).catch(() => {});
    const handler = () => {
      if (!user?.isAdmin && !isSubscriptionPage) setSubscriptionExpired(true);
    };
    window.addEventListener('subscription_expired', handler);
    return () => window.removeEventListener('subscription_expired', handler);
  }, [isAuthenticated, user?.isAdmin, isSubscriptionPage]);

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

  // Public routes accessible without auth
  if (location.pathname.startsWith('/cotizar/')) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="/cotizar/:userId/:tipo?" element={<CotizacionPublicaPage />} />
          <Route path="*" element={<Navigate to="/cotizar/not-found" replace />} />
        </Routes>
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
      <Layout
        user={user}
        onLogout={logout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        subscriptionWarning={subscriptionWarning}
      >
        <ErrorBoundary>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clientes" element={<ClientsPage />} />
            <Route path="/empresas" element={<CompaniesPage />} />
            <Route path="/vida-y-retiro" element={<LifeAndFinancePage />} />
            <Route path="/vida-finanzas" element={<Navigate to="/vida-y-retiro" replace />} />
            <Route path="/polizas" element={<PolicyForm />} />
            <Route path="/polizas/importar" element={<PolicyImportPage />} />
            <Route path="/siniestros" element={<SiniestrosPage />} />
            <Route path="/cotizaciones" element={<CotizacionesPage />} />
            <Route path="/directorio" element={<DirectoryPage />} />
            <Route path="/aseguradoras" element={<DirectoryPage />} />
            <Route path="/facturacion" element={<Navigate to="/comisiones" replace />} />
            <Route path="/comisiones" element={<BillingPage />} />
            <Route path="/referidos" element={<ReferralPage />} />
            <Route path="/herramientas" element={<ToolsPage />} />
            <Route path="/sugerencias" element={<SuggestionsPage />} />
            <Route path="/pagos" element={<PaymentPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            {user?.isAdmin && <Route path="/admin" element={<AdminPage />} />}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ErrorBoundary>
        {subscriptionExpired && (
          <Box sx={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: 'rgba(0,0,0,0.7)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Card sx={{ maxWidth: 500, p: 4, textAlign: 'center' }}>
              <Typography variant="h5" gutterBottom fontWeight={700} color="error">
                Suscripción Vencida
              </Typography>
              <Typography sx={{ mb: 3 }}>
                Tu plan ha expirado. Renová tu suscripción para seguir usando PAS Alert.
              </Typography>
              <Button variant="contained" size="large" onClick={() => {
                setSubscriptionExpired(false);
                navigate('/pagos');
              }}>
                Ir a Suscripción
              </Button>
              <Button variant="text" sx={{ mt: 1 }} onClick={logout}>
                Cerrar sesión
              </Button>
            </Card>
          </Box>
        )}
      </Layout>
    </ThemeProvider>
  );
}

export default function App() {
  return <AppSystem />;
}
