import React, { useState, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getTheme } from './theme';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<any>({
    nombre: 'Alejandro Díaz',
    email: 'alejandro.rh.diaz@gmail.com',
    plan: 'gratis',
    avatar: ''
  });

  const theme = useMemo(() => createTheme(getTheme(isDarkMode ? 'dark' : 'light')), [isDarkMode]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleToggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleUpdateProfile = (data: any) => {
    setUser({ ...user, ...data });
  };

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout 
          user={user} 
          onLogout={handleLogout} 
          isDarkMode={isDarkMode} 
          onToggleDarkMode={handleToggleDarkMode}
        >
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/clientes" element={<ClientsPage />} />
            <Route path="/empresas" element={<CompaniesPage />} />
            <Route path="/vida-finanzas" element={<LifeAndFinancePage />} />
            <Route path="/polizas" element={<PolicyForm />} />
            <Route path="/comisiones" element={<CommissionsPage />} />
            <Route path="/referidos" element={<ReferralPage />} />
            <Route path="/pagos" element={<PaymentPage />} />
            <Route path="/perfil" element={<ProfilePage user={user} onUpdate={handleUpdateProfile} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}
