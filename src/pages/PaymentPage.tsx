import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import { 
  CheckCircle2, 
  CreditCard, 
  Zap, 
  Shield, 
  Clock,
  ArrowRight
} from 'lucide-react';

export const PaymentPage: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    { name: 'Gratis', price: 0, duration: '5 días', limit: 'Ilimitado (Prueba)', features: ['Todas las funciones habilitadas', 'Soporte básico', 'CRM Completo', 'Empresas ilimitadas (Prueba)'] },
    { name: 'Emprendedor', price: 4999, duration: 'mes', limit: '20 Pólizas / 20 Clientes', features: ['Gestión de clientes', 'Incluye 20 Empresas', 'Alertas WhatsApp', 'CRM más cómodo', 'Más control'] },
    { name: 'Profesional', price: 12999, duration: 'mes', limit: '100 Pólizas / 100 Clientes', features: ['Todo lo de Emprendedor', 'Incluye 100 Empresas', 'Análisis de comisiones', 'CRM más cómodo', 'Más control'] },
    { name: 'Agencia', price: 29999, duration: 'mes', limit: '500 Pólizas / 500 Clientes', features: ['Todo lo de Profesional', 'Incluye 500 Empresas', 'Múltiples usuarios', 'CRM más cómodo', 'Más control'] },
  ];

  const handleSubscribe = async (plan: any) => {
    if (plan.price === 0) return;
    setLoading(plan.name);
    try {
      const response = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user_123',
          planName: plan.name,
          price: plan.price
        })
      });
      const data = await response.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Suscripción y Pagos</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Elige el plan que mejor se adapte a tu volumen de negocio.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 6 }}>
        {plans.map((plan) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={plan.name}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              border: plan.name === 'Profesional' ? '2px solid' : '1px solid',
              borderColor: plan.name === 'Profesional' ? 'primary.main' : 'divider',
              position: 'relative',
              overflow: 'visible'
            }}>
              {plan.name === 'Profesional' && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: -12, 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  bgcolor: 'primary.main',
                  color: 'white',
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  zIndex: 1
                }}>
                  MÁS POPULAR
                </Box>
              )}
              <CardContent sx={{ p: 3, flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{plan.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>${plan.price.toLocaleString()}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>/ {plan.duration}</Typography>
                </Box>
                <Typography variant="body2" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
                  {plan.limit}
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <List sx={{ mb: 3 }}>
                  {plan.features.map((feature, idx) => (
                    <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 28, color: 'secondary.main' }}>
                        <CheckCircle2 size={16} />
                      </ListItemIcon>
                      <ListItemText primary={feature} primaryTypographyProps={{ variant: 'body2' }} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
              <Box sx={{ p: 3, pt: 0 }}>
                <Button 
                  variant={plan.name === 'Profesional' ? 'contained' : 'outlined'} 
                  fullWidth 
                  disabled={plan.price === 0 || loading === plan.name}
                  onClick={() => handleSubscribe(plan)}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  {plan.price === 0 ? 'Plan Actual' : loading === plan.name ? 'Cargando...' : 'Seleccionar'}
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Shield size={20} /> Estado de tu Cuenta
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2">Plan Actual:</Typography>
                <Chip label="Gratis" color="info" size="small" sx={{ fontWeight: 700 }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2">Vencimiento:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>15 de Marzo, 2024</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Días restantes:</Typography>
                <Typography variant="body2" color="error" sx={{ fontWeight: 700 }}>5 días</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Clock size={20} /> Historial de Pagos
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ textAlign: 'center', py: 2, opacity: 0.5 }}>
                <CreditCard size={32} style={{ marginBottom: 8 }} />
                <Typography variant="body2">No hay pagos registrados.</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
