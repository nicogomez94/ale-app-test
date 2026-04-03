import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  List, ListItem, ListItemIcon, ListItemText, Divider, Chip,
  CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import { CheckCircle2, CreditCard, Shield, Clock } from 'lucide-react';
import { api } from '../api';

type BillingCycle = 'monthly' | 'annual';

type PlanDefinition = {
  key: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  oldMonthlyPrice?: number;
  oldAnnualPrice?: number;
  badge?: string;
  buttonLabel: string;
  accentColor: string;
  buttonColor: string;
  features: string[];
};

const PRICE_FORMATTER = new Intl.NumberFormat('es-AR');

const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Trial',
  EMPRENDEDOR: 'Starter',
  PROFESIONAL: 'Profesional',
  AGENCIA: 'Agencia',
};

const PLANS: PlanDefinition[] = [
  {
    key: 'EMPRENDEDOR',
    name: 'Starter',
    monthlyPrice: 6900,
    annualPrice: 69000,
    buttonLabel: 'Empezar ahora',
    accentColor: '#2e9b4b',
    buttonColor: '#2e9b4b',
    features: [
      'Hasta 30 pólizas',
      'Hasta 30 clientes',
      'Hasta 30 empresas',
      'CRM completo',
      'Alertas de vencimiento',
      'WhatsApp + Email',
      'Exportación a Excel',
    ],
  },
  {
    key: 'PROFESIONAL',
    name: 'Profesional',
    monthlyPrice: 14900,
    annualPrice: 149000,
    oldMonthlyPrice: 19900,
    oldAnnualPrice: 199000,
    badge: 'Más Popular',
    buttonLabel: 'Elegir plan',
    accentColor: '#1f67bd',
    buttonColor: '#1f67bd',
    features: [
      'Todo Starter',
      'Hasta 150 pólizas',
      'Análisis de comisiones',
      'Cierre mensual',
      'Reportes avanzados',
      'Soporte prioritario',
    ],
  },
  {
    key: 'PRO_PLUS',
    name: 'Pro+',
    monthlyPrice: 22900,
    annualPrice: 229000,
    buttonLabel: 'Escalar ahora',
    accentColor: '#6f42c1',
    buttonColor: '#6f42c1',
    features: [
      'Todo Profesional',
      'Hasta 300 pólizas',
      'Automatizaciones',
      'Métricas de crecimiento',
    ],
  },
  {
    key: 'AGENCIA',
    name: 'Agencia',
    monthlyPrice: 39900,
    annualPrice: 399000,
    buttonLabel: 'Crear equipo',
    accentColor: '#cf3d3d',
    buttonColor: '#cf3d3d',
    features: [
      'Todo Pro+',
      '500+ pólizas',
      'Multiusuario',
      'Roles y permisos',
      'Reportes por productor',
    ],
  },
];

export const PaymentPage: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');

  useEffect(() => {
    Promise.all([api.subscriptions.current(), api.subscriptions.payments()])
      .then(([sub, pay]) => { setSubscription(sub); setPayments(pay); })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, []);

  const handleSubscribe = async (plan: PlanDefinition) => {
    setLoading(plan.key);
    try {
      const selectedPrice = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
      const selectedBilling = billingCycle === 'annual' ? 'Anual' : 'Mensual';
      const data = await api.subscriptions.createPreference(`${plan.name} (${selectedBilling})`, selectedPrice);
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
  const planLabel = PLAN_LABELS[currentPlan] || 'Trial';

  if (fetching) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Suscripción y Pagos</Typography>
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, textAlign: 'center', fontSize: { xs: '2rem', md: '2.3rem' } }}>
        Elige el plan perfecto para tu negocio
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <ToggleButtonGroup
          color="primary"
          value={billingCycle}
          exclusive
          onChange={(_, value: BillingCycle | null) => value && setBillingCycle(value)}
          size="small"
          sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
        >
          <ToggleButton value="monthly" sx={{ px: 3, textTransform: 'none', fontWeight: 700 }}>
            Mensual
          </ToggleButton>
          <ToggleButton value="annual" sx={{ px: 3, textTransform: 'none', fontWeight: 700 }}>
            Anual (2 meses gratis)
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={3} sx={{ mb: 6 }}>
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isPopular = plan.key === 'PROFESIONAL';

          return (
            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={plan.name}>
              <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: isPopular ? '2px solid' : '1px solid',
                borderColor: isPopular ? 'primary.main' : 'divider',
                position: 'relative',
                overflow: 'visible',
                borderRadius: 3,
                bgcolor: isPopular ? 'rgba(25,118,210,0.03)' : 'background.paper',
                boxShadow: isPopular ? '0 10px 28px rgba(25, 118, 210, 0.18)' : '0 6px 18px rgba(16, 24, 40, 0.08)',
              }}>
                {isPopular && (
                  <Box sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    bgcolor: 'primary.main',
                    color: 'white',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1.5,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    zIndex: 1
                  }}>
                    {plan.badge}
                  </Box>
                )}
                <CardContent sx={{ p: 3, flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Box sx={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      bgcolor: plan.accentColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Shield size={24} color="#fff" />
                    </Box>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, textAlign: 'center' }}>{plan.name}</Typography>

                  {plan.oldMonthlyPrice && (
                    <Typography sx={{ textAlign: 'center', color: 'text.secondary', textDecoration: 'line-through', mb: 0.5, fontSize: '1.05rem' }}>
                      Antes ${PRICE_FORMATTER.format(plan.oldMonthlyPrice)}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5, mb: 1 }}>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: plan.accentColor }}>
                      ${PRICE_FORMATTER.format(plan.monthlyPrice)}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">/mes</Typography>
                  </Box>

                  {billingCycle === 'annual' && (
                    <Typography sx={{ textAlign: 'center', color: isPopular ? 'primary.main' : 'text.secondary', fontWeight: isPopular ? 700 : 600, mb: 2 }}>
                      o ${PRICE_FORMATTER.format(plan.annualPrice)} al año
                    </Typography>
                  )}

                  {billingCycle === 'annual' && plan.oldAnnualPrice && (
                    <Typography sx={{ textAlign: 'center', color: 'text.secondary', textDecoration: 'line-through', mb: 2, mt: -1, fontSize: '0.9rem' }}>
                      Antes ${PRICE_FORMATTER.format(plan.oldAnnualPrice)} al año
                    </Typography>
                  )}

                  <Divider sx={{ mb: 3 }} />
                  <List sx={{ mb: 3 }}>
                    {plan.features.map((feature, idx) => (
                      <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 28, color: plan.accentColor }}><CheckCircle2 size={16} /></ListItemIcon>
                        <ListItemText primary={feature} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <Box sx={{ p: 3, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={isCurrent || loading === plan.key}
                    onClick={() => handleSubscribe(plan)}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: 'none',
                      bgcolor: plan.buttonColor,
                      '&:hover': {
                        bgcolor: plan.buttonColor,
                        opacity: 0.92,
                      },
                    }}
                  >
                    {isCurrent ? 'Plan actual' : loading === plan.key ? 'Cargando...' : plan.buttonLabel}
                  </Button>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography sx={{ fontSize: '1.05rem', mb: 1 }}>
          ¿No estás seguro? <Box component="span" sx={{ fontWeight: 700 }}>Prueba 10 días gratis.</Box> <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>Garantía de devolución de 7 días.</Box>
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Pagos seguros con:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
          <Chip label="Mercado Pago" variant="outlined" />
          <Chip label="Transferencia" variant="outlined" />
          <Chip label="VISA" variant="outlined" />
          <Chip label="Mastercard" variant="outlined" />
        </Box>
      </Box>

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
