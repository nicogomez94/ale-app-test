import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Divider,
  InputAdornment,
  IconButton,
  Link
} from '@mui/material';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Bell,
  ArrowRight
} from 'lucide-react';

export const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        bgcolor: 'slate.50'
      }}
    >
      {/* Left Side - Branding */}
      <Box 
        sx={{ 
          flex: 1, 
          bgcolor: 'primary.main', 
          color: 'white',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          p: 8,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
            <Box sx={{ 
              width: 64, 
              height: 64, 
              bgcolor: 'white', 
              borderRadius: 3, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'primary.main',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
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
        
        {/* Abstract background shape */}
        <Box 
          sx={{ 
            position: 'absolute', 
            bottom: -100, 
            right: -100, 
            width: 500, 
            height: 500, 
            borderRadius: '50%', 
            bgcolor: 'rgba(255,255,255,0.05)' 
          }} 
        />
      </Box>

      {/* Right Side - Form */}
      <Box 
        sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          p: 4
        }}
      >
        <Card sx={{ maxWidth: 450, width: '100%', p: 2 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
              Bienvenido
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Ingresa tus credenciales para acceder a tu panel.
            </Typography>

            <Button 
              fullWidth 
              variant="outlined" 
              startIcon={<img src="https://www.google.com/favicon.ico" width={18} alt="Google" />}
              sx={{ mb: 3, py: 1.5, borderColor: 'divider', color: 'text.primary' }}
              onClick={onLogin}
            >
              Continuar con Google
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Divider sx={{ flex: 1 }} />
              <Typography variant="caption" sx={{ px: 2, color: 'text.secondary' }}>O CON EMAIL</Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>

            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Correo electrónico"
                placeholder="ejemplo@correo.com"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={18} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock size={18} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Link href="#" variant="caption" sx={{ fontWeight: 600 }}>¿Olvidaste tu contraseña?</Link>
              </Box>

              <Button 
                fullWidth 
                variant="contained" 
                size="large" 
                onClick={onLogin}
                sx={{ py: 1.5, mt: 2, borderRadius: 2 }}
                endIcon={<ArrowRight size={18} />}
              >
                Iniciar Sesión
              </Button>
            </Box>

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                ¿No tienes una cuenta? <Link href="#" sx={{ fontWeight: 700 }}>Regístrate gratis</Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 4 }}>
          © 2024 PAS Alert. Todos los derechos reservados.
        </Typography>
      </Box>
    </Box>
  );
};
