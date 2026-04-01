import { useState, useEffect, useMemo, Component, ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Alert, Button, Card, Typography } from '@mui/material';
import { api } from './api';
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
import { AdminPage } from './pages/AdminPage';
// Landing pages
import { LandingPage } from './pages/landing/LandingPage';
import { NosotrosPage } from './pages/landing/NosotrosPage';
import { ProductosPage } from './pages/landing/ProductosPage';
import { CoberturasPage } from './pages/landing/CoberturasPage';
import { SiniestrosPage } from './pages/landing/SiniestrosPage';
import { GestoriaAutomotorPage } from './pages/landing/GestoriaAutomotorPage';
import { ContactoPage } from './pages/landing/ContactoPage';
import { ProductoresPage } from './pages/landing/ProductoresPage';

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

  const theme = useMemo(() => createTheme(getTheme(isDarkMode ? 'dark' : 'light')), [isDarkMode]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.subscriptions.current().then((sub: any) => {
      if (sub.accesoBloqueado) {
        setSubscriptionExpired(true);
      } else if (sub.diasRestantes !== undefined && sub.diasRestantes <= 5 && sub.diasRestantes > 0) {
        setSubscriptionWarning({ show: true, diasRestantes: sub.diasRestantes });
      }
    }).catch(() => {});
    const handler = () => setSubscriptionExpired(true);
    window.addEventListener('subscription_expired', handler);
    return () => window.removeEventListener('subscription_expired', handler);
  }, [isAuthenticated]);

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
      <Layout
        user={user}
        onLogout={logout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        subscriptionWarning={subscriptionWarning}
      >
        <ErrorBoundary>
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clientes" element={<ClientsPage />} />
            <Route path="empresas" element={<CompaniesPage />} />
            <Route path="vida-finanzas" element={<LifeAndFinancePage />} />
            <Route path="polizas" element={<PolicyForm />} />
            <Route path="comisiones" element={<CommissionsPage />} />
            <Route path="referidos" element={<ReferralPage />} />
            <Route path="pagos" element={<PaymentPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            {user?.isAdmin && <Route path="admin" element={<AdminPage />} />}
            <Route path="*" element={<Navigate to="/app/dashboard" />} />
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
                Tu plan ha expirado. Renová tu suscripción para seguir usando AD System.
              </Typography>
              <Button variant="contained" size="large" onClick={() => {
                setSubscriptionExpired(false);
                window.location.href = '/app/pagos';
              }}>
                Ir a Suscripción
              </Button>
            </Card>
          </Box>
        )}
      </Layout>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public landing routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/quienes-somos" element={<NosotrosPage />} />
      <Route path="/seguros" element={<ProductosPage />} />
      <Route path="/coberturas" element={<CoberturasPage />} />
      <Route path="/asistencia-juridica" element={<SiniestrosPage />} />
      <Route path="/gestoria-automotor" element={<GestoriaAutomotorPage />} />
      <Route path="/productores" element={<ProductoresPage />} />
      <Route path="/contacto" element={<ContactoPage />} />
      {/* App system routes */}
      <Route path="/app/*" element={<AppSystem />} />
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
