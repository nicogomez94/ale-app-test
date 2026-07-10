import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { CheckCircle2, CreditCard, Shield, Clock, RefreshCcw, Ban } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

type PlanDefinition = {
  key: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  annualEnabled: boolean;
  annualDiscountMonths: number;
  features: string[];
};

const PRICE_FORMATTER = new Intl.NumberFormat('es-AR');

const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Trial',
  EMPRENDEDOR: 'Starter',
  PROFESIONAL: 'Profesional',
  AGENCIA: 'Agencia',
};

const PLAN_COLORS: Record<string, string> = {
  EMPRENDEDOR: '#2e9b4b',
  PROFESIONAL: '#1f67bd',
  AGENCIA: '#cf3d3d',
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProviderStatusLabel(status?: string | null) {
  switch ((status || '').toLowerCase()) {
    case 'authorized':
      return 'Autorizada';
    case 'pending':
      return 'Pendiente';
    case 'paused':
      return 'Pausada';
    case 'canceled':
    case 'cancelled':
      return 'Cancelada';
    default:
      return 'Sin estado';
  }
}

function getProviderStatusColor(status?: string | null): 'success' | 'warning' | 'default' | 'error' {
  switch ((status || '').toLowerCase()) {
    case 'authorized':
      return 'success';
    case 'pending':
    case 'paused':
      return 'warning';
    case 'canceled':
    case 'cancelled':
      return 'default';
    default:
      return 'default';
  }
}

export const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateUser, user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [loading, setLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [subscribeSuccess, setSubscribeSuccess] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const currentPlan = subscription?.plan || 'TRIAL';
  const planLabel = PLAN_LABELS[currentPlan] || 'Trial';
  const providerStatusLabel = getProviderStatusLabel(subscription?.providerStatus);
  const providerStatusColor = getProviderStatusColor(subscription?.providerStatus);

  const loadSubscriptionState = useCallback(async () => {
    const [sub, pay, me, planData] = await Promise.all([
      api.subscriptions.current(),
      api.subscriptions.payments(),
      api.auth.me().catch(() => null),
      api.subscriptions.plans(),
    ]);

    setSubscription(sub);
    setPayments(pay);
    setPlans(planData);

    if (me) {
      updateUser({
        plan: me.plan,
        estado: me.estado,
        planVencimiento: me.planVencimiento,
      });
    }

    return sub;
  }, [updateUser]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setFetching(true);
        const params = new URLSearchParams(location.search);
        const returnFromSubscription =
          params.get('subscription') === 'processing' ||
          params.has('preapproval_id') ||
          params.has('status');

        if (returnFromSubscription) {
          setValidating(true);
          setSubscribeError(null);
          setSubscribeSuccess('Validando suscripción con Mercado Pago...');

          let activated = false;
          let lastSnapshot: any = null;

          for (let attempt = 0; attempt < 6; attempt += 1) {
            if (cancelled) return;
            lastSnapshot = await loadSubscriptionState();
            if (lastSnapshot?.plan && lastSnapshot.plan !== 'TRIAL') {
              activated = true;
              break;
            }
            await sleep(3000);
          }

          if (!cancelled) {
            if (activated) {
              setSubscribeSuccess('Suscripción activa. El plan ya quedó actualizado.');
            } else if (lastSnapshot?.providerStatus === 'canceled') {
              setSubscribeError('La suscripción volvió cancelada desde Mercado Pago.');
              setSubscribeSuccess(null);
            } else {
              setSubscribeSuccess('La suscripción fue creada. Estamos esperando la confirmación final del primer cobro.');
            }
            navigate('/pagos', { replace: true });
          }
        } else {
          await loadSubscriptionState();
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setSubscribeError(error instanceof Error ? error.message : 'No se pudo cargar suscripción');
        }
      } finally {
        if (!cancelled) {
          setValidating(false);
          setFetching(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [loadSubscriptionState, location.search, navigate]);

  const activeRecurringPlan = useMemo(() => {
    if (!subscription?.providerStatus || currentPlan === 'TRIAL') return null;
    return plans.find((plan) => plan.key === currentPlan) || null;
  }, [currentPlan, plans, subscription?.providerStatus]);

  const handleSubscribe = async (plan: PlanDefinition) => {
    if (isAdmin) {
      setSubscribeError('Los administradores no pueden suscribirse.');
      return;
    }

    setSubscribeError(null);
    setSubscribeSuccess(null);
    setLoading(plan.key);

    try {
      const data = await api.subscriptions.createPreapproval(plan.key, billingCycle);
      if (data.init_point) {
        window.location.href = data.init_point;
      }
    } catch (error) {
      console.error(error);
      setSubscribeError(error instanceof Error ? error.message : 'No se pudo iniciar la suscripción');
    } finally {
      setLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setSubscribeError(null);

    try {
      const result = await api.subscriptions.cancel();
      await loadSubscriptionState();
      setSubscribeSuccess(result.message);
    } catch (error) {
      console.error(error);
      setSubscribeError(error instanceof Error ? error.message : 'No se pudo cancelar la suscripción');
    } finally {
      setCancelLoading(false);
    }
  };

  if (fetching) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Suscripción y Pagos</Typography>
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, textAlign: 'center', fontSize: { xs: '2rem', md: '2.3rem' } }}>
        Elegí el plan que acompaña tu crecimiento
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <ToggleButtonGroup
          exclusive
          value={billingCycle}
          onChange={(_, value) => value && setBillingCycle(value)}
          color="primary"
          aria-label="Frecuencia de facturación"
          sx={{ bgcolor: 'background.paper', boxShadow: '0 6px 20px rgba(16,24,40,.08)' }}
        >
          <ToggleButton value="MONTHLY" sx={{ px: 3, fontWeight: 800 }}>Mensual</ToggleButton>
          <ToggleButton value="ANNUAL" sx={{ px: 3, fontWeight: 800 }}>
            Anual · 2 meses gratis
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {isAdmin && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Tu usuario es administrador, por eso no puede suscribirse ni renovar un plan.
        </Alert>
      )}

      {validating && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Estamos esperando la sincronización del webhook de Mercado Pago.
        </Alert>
      )}
      {subscribeSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {subscribeSuccess}
        </Alert>
      )}
      {subscribeError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {subscribeError}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 6 }}>
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan && currentPlan !== 'TRIAL';
          const isPopular = plan.key === 'PROFESIONAL';
          const annualUnavailable = billingCycle === 'ANNUAL' && !plan.annualEnabled;
          const isDisabled = isAdmin || isCurrent || loading === plan.key || annualUnavailable || !!subscription?.canCancel;
          const accentColor = PLAN_COLORS[plan.key] || '#1f67bd';
          const displayedPrice = billingCycle === 'ANNUAL' ? plan.annualPrice : plan.monthlyPrice;

          return (
            <Grid size={{ xs: 12, md: 4 }} key={plan.key}>
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
                    zIndex: 1,
                  }}>
                    Más elegido
                  </Box>
                )}
                <CardContent sx={{ p: 3, flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Box sx={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      bgcolor: accentColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Shield size={24} color="#fff" />
                    </Box>
                  </Box>

                  <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, textAlign: 'center' }}>
                    {plan.name}
                  </Typography>

                  {billingCycle === 'ANNUAL' && plan.annualEnabled && (
                    <Typography sx={{ textAlign: 'center', color: 'text.secondary', textDecoration: 'line-through', mb: 0.5, fontSize: '1.05rem' }}>
                      ${PRICE_FORMATTER.format(plan.monthlyPrice * 12)} por año
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5, mb: 2 }}>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: accentColor, fontSize: '2rem' }}>
                      ${PRICE_FORMATTER.format(displayedPrice)}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">/{billingCycle === 'ANNUAL' ? 'año' : 'mes'}</Typography>
                  </Box>

                  {billingCycle === 'ANNUAL' && plan.annualEnabled && (
                    <Typography variant="body2" color="success.main" fontWeight={800} textAlign="center" sx={{ mt: -1, mb: 2 }}>
                      Ahorrás ${PRICE_FORMATTER.format(plan.monthlyPrice * plan.annualDiscountMonths)}
                    </Typography>
                  )}

                  <Divider sx={{ mb: 3 }} />

                  <List sx={{ mb: 3 }}>
                    {plan.features.map((feature, idx) => (
                      <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 28, color: accentColor }}>
                          <CheckCircle2 size={16} />
                        </ListItemIcon>
                        <ListItemText primary={feature} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>

                <Box sx={{ p: 3, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={isDisabled}
                    onClick={() => handleSubscribe(plan)}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: 'none',
                      bgcolor: accentColor,
                      '&:hover': {
                        bgcolor: accentColor,
                        opacity: 0.92,
                      },
                    }}
                  >
                    {isAdmin ? 'No disponible para admins' : isCurrent ? 'Plan actual' : annualUnavailable ? 'Anual no disponible' : loading === plan.key ? 'Redirigiendo...' : 'Suscribirme'}
                  </Button>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography sx={{ fontSize: '1.05rem', mb: 1 }}>
          La renovación automática se cobra {billingCycle === 'ANNUAL' ? 'una vez por año' : 'mes a mes'} desde Mercado Pago.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Si cancelás, se frena la próxima renovación pero mantenés acceso hasta la fecha ya paga.
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Pagos seguros con:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
          <Chip label="Mercado Pago" variant="outlined" />
          <Chip label="VISA" variant="outlined" />
          <Chip label="Mastercard" variant="outlined" />
          <Chip label="Débito automático" variant="outlined" />
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
                <Typography variant="body2">Plan actual:</Typography>
                <Chip label={planLabel} color="info" size="small" sx={{ fontWeight: 700 }} />
              </Box>

              {activeRecurringPlan && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2">Suscripción recurrente:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {activeRecurringPlan.name} {subscription?.billingCycle === 'ANNUAL' ? 'anual' : 'mensual'}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2">Estado remoto:</Typography>
                <Chip label={providerStatusLabel} size="small" color={providerStatusColor} />
              </Box>

              {subscription?.planVencimiento && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2">Acceso hasta:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {new Date(subscription.planVencimiento).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Typography>
                </Box>
              )}

              {subscription?.nextPaymentDate && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2">Próximo cobro:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {new Date(subscription.nextPaymentDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="body2">Días restantes:</Typography>
                <Typography variant="body2" color={subscription?.diasRestantes <= 5 ? 'error' : 'text.primary'} sx={{ fontWeight: 700 }}>
                  {subscription?.diasRestantes ?? '—'} días
                </Typography>
              </Box>

              {subscription?.canCancel ? (
                <Box>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<Ban size={16} />}
                    disabled={cancelLoading}
                    onClick={handleCancelSubscription}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    {cancelLoading ? 'Cancelando...' : 'Cancelar renovación automática'}
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    La suscripción deja de renovarse, pero seguís con acceso hasta el final del período pago.
                  </Typography>
                </Box>
              ) : subscription?.providerStatus === 'canceled' ? (
                <Typography variant="body2" color="text.secondary">
                  La renovación automática está cancelada. Tu acceso se mantiene hasta la fecha ya paga.
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Todavía no hay una suscripción recurrente activa para cancelar.
                </Typography>
              )}
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

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<RefreshCcw size={16} />}
                  onClick={() => loadSubscriptionState()}
                  sx={{ textTransform: 'none' }}
                >
                  Actualizar
                </Button>
              </Box>

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
                      {payments.map((payment: any) => (
                        <TableRow key={payment.id} hover>
                          <TableCell>{new Date(payment.createdAt).toLocaleDateString('es-AR')}</TableCell>
                          <TableCell>{PLAN_LABELS[payment.plan] || payment.plan}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>$ {payment.monto.toLocaleString()}</TableCell>
                          <TableCell>
                            <Chip size="small" label={payment.estado} color={payment.estado === 'approved' ? 'success' : 'default'} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 2, opacity: 0.5 }}>
                  <CreditCard size={32} style={{ marginBottom: 8 }} />
                  <Typography variant="body2">No hay datos</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
