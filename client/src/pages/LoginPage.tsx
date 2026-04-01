import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Card, CardContent,
  Divider, InputAdornment, IconButton, Link, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Stepper, Step, StepLabel
} from '@mui/material';
import { Mail, Lock, Eye, EyeOff, Bell, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
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

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(0);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

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

  const handleForgotSendCode = async () => {
    setForgotError('');
    if (!forgotEmail) { setForgotError('Ingresa tu email.'); return; }
    setForgotLoading(true);
    try {
      await api.auth.forgotPassword(forgotEmail);
      setForgotStep(1);
      setForgotSuccess('Si el email está registrado, recibirás un código. Revisá la consola del servidor en modo desarrollo.');
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async () => {
    setForgotError('');
    if (!forgotCode) { setForgotError('Ingresa el código.'); return; }
    if (forgotNewPassword.length < 6) { setForgotError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (forgotNewPassword !== forgotConfirm) { setForgotError('Las contraseñas no coinciden.'); return; }
    setForgotLoading(true);
    try {
      const result = await api.auth.resetPassword(forgotEmail, forgotCode, forgotNewPassword);
      setForgotStep(2);
      setForgotSuccess(result.message);
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotDialog = () => {
    setForgotOpen(false);
    setForgotStep(0);
    setForgotEmail('');
    setForgotCode('');
    setForgotNewPassword('');
    setForgotConfirm('');
    setForgotError('');
    setForgotSuccess('');
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
              <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>AD System</Typography>
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
                  <Link component="button" type="button" variant="caption" sx={{ fontWeight: 600 }} onClick={() => { setForgotOpen(true); setForgotEmail(email); }}>¿Olvidaste tu contraseña?</Link>
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
          © 2026 AD System. Todos los derechos reservados.
        </Typography>
      </Box>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onClose={closeForgotDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Recuperar Contraseña</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Stepper activeStep={forgotStep} sx={{ mb: 3 }}>
            <Step><StepLabel>Email</StepLabel></Step>
            <Step><StepLabel>Código</StepLabel></Step>
            <Step><StepLabel>Listo</StepLabel></Step>
          </Stepper>

          {forgotError && <Alert severity="error" sx={{ mb: 2 }}>{forgotError}</Alert>}
          {forgotSuccess && <Alert severity="success" sx={{ mb: 2 }}>{forgotSuccess}</Alert>}

          {forgotStep === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Ingresá tu email registrado. Te enviaremos un código de 6 dígitos para restablecer tu contraseña.
              </Typography>
              <TextField
                fullWidth label="Correo electrónico" type="email"
                value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Mail size={18} /></InputAdornment> }}
              />
            </Box>
          )}

          {forgotStep === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Ingresá el código de 6 dígitos y tu nueva contraseña.
              </Typography>
              <TextField
                fullWidth label="Código de verificación" placeholder="123456"
                value={forgotCode} onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputProps={{ maxLength: 6, style: { letterSpacing: 8, textAlign: 'center', fontSize: 24, fontWeight: 700 } }}
              />
              <TextField
                fullWidth label="Nueva contraseña" type="password"
                value={forgotNewPassword} onChange={(e) => setForgotNewPassword(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Lock size={18} /></InputAdornment> }}
              />
              <TextField
                fullWidth label="Confirmar contraseña" type="password"
                value={forgotConfirm} onChange={(e) => setForgotConfirm(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Lock size={18} /></InputAdornment> }}
              />
            </Box>
          )}

          {forgotStep === 2 && (
            <Typography variant="body1" sx={{ textAlign: 'center', py: 2 }}>
              Tu contraseña fue actualizada. Ya podés iniciar sesión.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForgotDialog}>{forgotStep === 2 ? 'Cerrar' : 'Cancelar'}</Button>
          {forgotStep === 0 && (
            <Button variant="contained" onClick={handleForgotSendCode} disabled={forgotLoading}>
              {forgotLoading ? 'Enviando...' : 'Enviar Código'}
            </Button>
          )}
          {forgotStep === 1 && (
            <Button variant="contained" onClick={handleForgotReset} disabled={forgotLoading}>
              {forgotLoading ? 'Verificando...' : 'Restablecer Contraseña'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
