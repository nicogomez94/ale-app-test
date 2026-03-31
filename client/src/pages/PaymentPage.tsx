import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  List, ListItem, ListItemIcon, ListItemText, Divider, Chip,
  CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper
} from '@mui/material';
import { CheckCircle2, CreditCard, Shield, Clock } from 'lucide-react';
import { api } from '../api';

export const PaymentPage: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    Promise.all([api.subscriptions.current(), api.subscriptions.payments()])
      .then(([sub, pay]) => { setSubscription(sub); setPayments(pay); })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, []);

  const plans = [
    { name: 'Gratis', key: 'TRIAL', price: 0, duration: '5 días', limit: 'Ilimitado (Prueba)', features: ['Todas las funciones habilitadas', 'Soporte básico', 'CRM Completo', 'Empresas ilimitadas (Prueba)'] },
    { name: 'Emprendedor', key: 'EMPRENDEDOR', price: 4999, duration: 'mes', limit: '20 Pólizas / 20 Clientes', features: ['Gestión de clientes', 'Incluye 20 Empresas', 'Alertas WhatsApp', 'CRM más cómodo', 'Más control'] },
    { name: 'Profesional', key: 'PROFESIONAL', price: 12999, duration: 'mes', limit: '100 Pólizas / 100 Clientes', features: ['Todo lo de Emprendedor', 'Incluye 100 Empresas', 'Análisis de comisiones', 'CRM más cómodo', 'Más control'] },
    { name: 'Agencia', key: 'AGENCIA', price: 29999, duration: 'mes', limit: '500 Pólizas / 500 Clientes', features: ['Todo lo de Profesional', 'Incluye 500 Empresas', 'Múltiples usuarios', 'CRM más cómodo', 'Más control'] },
  ];

  const handleSubscribe = async (plan: any) => {
    if (plan.price === 0) return;
    setLoading(plan.name);
    try {
      const data = await api.subscriptions.createPreference(plan.name, plan.price);
      if (data.init_point) {
        window.location.href = data.init_point;
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(null);
    }
  };

  const currentPlan = subscription?.plan || 'TRIAL';
  const planLabel = plans.find(p => p.key === currentPlan)?.name || 'Gratis';

  if (fetching) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Suscripción y Pagos</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Elige el plan que mejor se adapte a tu volumen de negocio.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 6 }}>
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          return (
            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={plan.name}>
              <Card sx={{
                height: '100%', display: 'flex', flexDirection: 'column',
                border: plan.name === 'Profesional' ? '2px solid' : '1px solid',
                borderColor: plan.name === 'Profesional' ? 'primary.main' : 'divider',
                position: 'relative', overflow: 'visible'
              }}>
                {plan.name === 'Profesional' && (
                  <Box sx={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    bgcolor: 'primary.main', color: 'white', px: 2, py: 0.5,
                    borderRadius: 2, fontSize: '0.75rem', fontWeight: 700, zIndex: 1
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
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 700, mb: 3 }}>{plan.limit}</Typography>
                  <Divider sx={{ mb: 3 }} />
                  <List sx={{ mb: 3 }}>
                    {plan.features.map((feature, idx) => (
                      <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 28, color: 'secondary.main' }}><CheckCircle2 size={16} /></ListItemIcon>
                        <ListItemText primary={feature} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <Box sx={{ p: 3, pt: 0 }}>
                  <Button
                    variant={plan.name === 'Profesional' ? 'contained' : 'outlined'}
                    fullWidth disabled={isCurrent || loading === plan.name}
                    onClick={() => handleSubscribe(plan)}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    {isCurrent ? 'Plan Actual' : loading === plan.name ? 'Cargando...' : 'Seleccionar'}
                  </Button>
                </Box>
              </Card>
            </Grid>
          );
        })}
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
                <Chip label={planLabel} color="info" size="small" sx={{ fontWeight: 700 }} />
              </Box>
              {subscription?.vencimiento && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2">Vencimiento:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {new Date(subscription.vencimiento).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Días restantes:</Typography>
                <Typography variant="body2" color={subscription?.diasRestantes <= 5 ? 'error' : 'text.primary'} sx={{ fontWeight: 700 }}>
                  {subscription?.diasRestantes ?? '—'} días
                </Typography>
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
              {payments.length > 0 ? (
                <TableContainer component={Paper} elevation={0}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Plan</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Monto</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payments.map((p: any) => (
                        <TableRow key={p.id} hover>
                          <TableCell>{new Date(p.createdAt).toLocaleDateString('es-AR')}</TableCell>
                          <TableCell>{p.plan}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>$ {p.monto.toLocaleString()}</TableCell>
                          <TableCell>
                            <Chip size="small" label={p.estado} color={p.estado === 'approved' ? 'success' : 'default'} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 2, opacity: 0.5 }}>
                  <CreditCard size={32} style={{ marginBottom: 8 }} />
                  <Typography variant="body2">No hay pagos registrados.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
