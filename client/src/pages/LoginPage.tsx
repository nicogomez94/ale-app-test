import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Card, CardContent,
  Divider, InputAdornment, IconButton, Link, Alert
} from '@mui/material';
import { Mail, Lock, Eye, EyeOff, Bell, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEBUG, debugData } from '../data/debugData';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState(DEBUG ? debugData.login.email : '');
  const [password, setPassword] = useState(DEBUG ? debugData.login.password : '');
  const [nombre, setNombre] = useState(DEBUG ? 'Usuario Debug' : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        if (!nombre.trim()) { setError('El nombre es requerido'); setLoading(false); return; }
        await register(nombre, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left Side - Branding */}
      <Box sx={{
        flex: 1, bgcolor: 'primary.main', color: 'white',
        display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'center',
        p: 8, position: 'relative', overflow: 'hidden'
      }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
            <Box sx={{
              width: 64, height: 64, bgcolor: 'white', borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'primary.main', boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
            }}>
              <Bell size={40} />
            </Box>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>PAS ALERT</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 2, opacity: 0.8 }}>INSURANCE TECH</Typography>
            </Box>
          </Box>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
            La herramienta definitiva para el Productor de Seguros moderno.
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 400, maxWidth: 500 }}>
            Gestiona pólizas, automatiza avisos de vencimiento y escala tu negocio con inteligencia.
          </Typography>
        </Box>
        <Box sx={{ position: 'absolute', bottom: -100, right: -100, width: 500, height: 500, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
      </Box>

      {/* Right Side - Form */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <Card sx={{ maxWidth: 450, width: '100%', p: 2 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
              {isRegister ? 'Crear Cuenta' : 'Bienvenido'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              {isRegister ? 'Registrate para comenzar tu prueba gratuita de 10 días.' : 'Ingresa tus credenciales para acceder a tu panel.'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {isRegister && (
                <TextField
                  fullWidth
                  label="Nombre Completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              )}
              <TextField
                fullWidth
                label="Correo electrónico"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Mail size={18} /></InputAdornment>,
                }}
              />
              <TextField
                fullWidth
                label="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                type={showPassword ? 'text' : 'password'}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock size={18} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {!isRegister && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Link href="#" variant="caption" sx={{ fontWeight: 600 }}>¿Olvidaste tu contraseña?</Link>
                </Box>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ py: 1.5, mt: 2, borderRadius: 2 }}
                endIcon={<ArrowRight size={18} />}
              >
                {loading ? 'Cargando...' : isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
              </Button>
            </Box>

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {isRegister ? '¿Ya tienes una cuenta? ' : '¿No tienes una cuenta? '}
                <Link
                  component="button"
                  variant="body2"
                  sx={{ fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => { setIsRegister(!isRegister); setError(''); }}
                >
                  {isRegister ? 'Iniciar Sesión' : 'Regístrate gratis'}
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 4 }}>
          © 2026 PAS Alert. Todos los derechos reservados.
        </Typography>
      </Box>
    </Box>
  );
};
