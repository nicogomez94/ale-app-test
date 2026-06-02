import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  AlertCircle,
  CheckSquare,
  Clock,
  Edit2,
  FileCheck,
  Hash,
  HeartPulse,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Square,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, DashboardPolicy, PolicyPayload } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  ASEGURADORAS,
  calculateVencimiento,
  classifyGeneralPolicyTypeFromRubro,
  GENERAL_RUBRO_OPTIONS,
  getQuotaTotalFromVigencia,
  PAYMENT_OPTIONS,
  PolicyVigencia,
  PROVINCIAS_ARGENTINA,
  VIGENCIA_OPTIONS,
} from '../data/policyCatalogs';

const VISIBLE_POLICIES_LIMIT = 5;

type EditFormValues = {
  clienteNombre: string;
  clienteDni: string;
  clienteTelefono: string;
  clienteEmail: string;
  clienteDireccion: string;
  clienteAltura: string;
  clienteCp: string;
  clienteProvincia: string;
  clienteLocalidad: string;
  aseguradora: string;
  rubro: string;
  numeroPoliza: string;
  fechaInicio: string;
  fechaVencimiento: string;
  medioPago: string;
  vigencia: PolicyVigencia;
  prima: string;
  porcentajeComision: string;
  moneda: string;
  pagada: boolean;
  fechaPago: string;
};

const StatCard = ({ title, value, icon, color, subtitle, onClick, active }: any) => (
  <Card
    sx={{
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      border: active ? 2 : 0,
      borderColor: active ? `${color}.main` : 'transparent',
      transition: 'all 0.2s',
      '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: 4 } : {},
    }}
    onClick={onClick}
  >
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 1 }}>{title}</Typography>
          <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>{value}</Typography>
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: '50%',
            bgcolor: `${color}.main`,
            color: 'common.white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& svg': { color: 'common.white' },
          }}
        >
          {icon}
        </Box>
      </Box>
      {subtitle && <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>{subtitle}</Typography>}
    </CardContent>
  </Card>
);

const formatMoney = (value?: number | null) => {
  if (value == null) return '$0';
  return `$ ${value.toLocaleString('es-AR')}`;
};

const formatAmountInput = (value: string): string => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(numeric);
};

const parseAmountInput = (value: string): string => {
  const cleaned = value.replace(/[^\d.,]/g, '');
  if (!cleaned) return '';
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? String(parsed) : '';
};

const getStatusVisual = (policy: DashboardPolicy) => {
  if (policy.pagada) {
    return { label: 'PAGADO', color: 'success.main', textColor: 'white', detail: policy.fechaPago ? format(parseISO(policy.fechaPago), 'dd/MM/yyyy') : '' };
  }

  if (policy.estado === 'VENCIDA') {
    return { label: 'Vencida', color: 'error.main', textColor: 'white', detail: `${policy.diasRestantes} dias` };
  }

  if (policy.estado === 'VENCE_PRONTO') {
    return { label: 'Vence pronto', color: 'warning.main', textColor: 'black', detail: policy.diasRestantes === 0 ? 'Hoy' : `${policy.diasRestantes} dias` };
  }

  return { label: 'Vigente', color: 'success.main', textColor: 'white', detail: policy.diasRestantes === 0 ? 'Hoy' : `${policy.diasRestantes} dias` };
};

const PolicyTable = ({
  title,
  policies,
  onWhatsApp,
  onEmail,
  onDelete,
  onEdit,
  onTogglePaid,
  onUpdatePaymentDate,
  headerColor,
  showAll,
  totalCount,
  onToggleShowAll,
}: {
  title: string;
  policies: DashboardPolicy[];
  onWhatsApp: (policy: DashboardPolicy) => void;
  onEmail: (policy: DashboardPolicy) => void;
  onDelete: (policy: DashboardPolicy) => void;
  onEdit: (policy: DashboardPolicy) => void;
  onTogglePaid: (policy: DashboardPolicy) => void;
  onUpdatePaymentDate: (policy: DashboardPolicy, date: string) => void;
  headerColor: string;
  showAll: boolean;
  totalCount: number;
  onToggleShowAll: () => void;
}) => {
  const visiblePolicies = showAll ? policies : policies.slice(0, VISIBLE_POLICIES_LIMIT);

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
          {totalCount > VISIBLE_POLICIES_LIMIT && (
            <Button size="small" onClick={onToggleShowAll}>
              {showAll ? 'Ver menos' : 'Ver todas'}
            </Button>
          )}
        </Box>
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table>
            <TableHead sx={{ bgcolor: headerColor }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Cliente / Empresa</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>Inicio Vigencia</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>Vencimiento</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>Vigencia</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>Cuota</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>Pagado</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>Ultima Gestion</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'right' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visiblePolicies.map((policy) => {
                const status = getStatusVisual(policy);

                return (
                  <TableRow key={policy.id} hover>
                    <TableCell sx={{ fontWeight: 600, minWidth: 220 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{policy.cliente}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                        Poliza: {policy.poliza}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'inline-block', px: 1, py: 0.25, mt: 0.75, borderRadius: 1, bgcolor: 'primary.dark', color: 'common.white', fontWeight: 700 }}>
                        {policy.aseguradora}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', mt: 0.5 }}>
                        {policy.tipo === 'EMPRESA' ? 'EMPRESA' : 'INDIVIDUAL'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {policy.inicio ? format(parseISO(policy.inicio), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {format(parseISO(policy.vencimiento), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', minWidth: 120 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'inline-block',
                          px: 1.2,
                          py: 0.4,
                          borderRadius: 5,
                          fontWeight: 700,
                          bgcolor: status.color,
                          color: status.textColor,
                        }}
                      >
                        {status.label}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 0.75, fontWeight: 700, color: policy.estado === 'VENCIDA' ? 'error.main' : policy.estado === 'VENCE_PRONTO' ? 'warning.dark' : 'text.secondary' }}>
                        {status.detail || policy.vigenciaLabel}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', minWidth: 120 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {policy.cuota}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {policy.medioPago || '-'}
                      </Typography>
                      {policy.moneda && policy.moneda !== 'ARS' && (
                        <Typography variant="caption" sx={{ display: 'inline-block', px: 0.75, py: 0.1, borderRadius: 0.75, bgcolor: 'warning.light', color: 'warning.dark', fontWeight: 700, mt: 0.5 }}>
                          {policy.moneda}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', minWidth: 150 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton size="small" onClick={() => onTogglePaid(policy)} sx={{ color: policy.pagada ? 'success.main' : 'text.disabled' }}>
                            {policy.pagada ? <CheckSquare size={22} /> : <Square size={22} />}
                          </IconButton>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: policy.pagada ? 'success.main' : 'text.secondary' }}>
                            {policy.pagada ? 'SI' : 'NO'}
                          </Typography>
                        </Box>
                        {policy.pagada && (
                          <TextField
                            type="date"
                            size="small"
                            value={policy.fechaPago || ''}
                            onChange={(event) => onUpdatePaymentDate(policy, event.target.value)}
                            sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem', p: '6px 8px', width: '110px' } }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', minWidth: 150 }}>
                      {policy.ultimaGestion ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            {policy.ultimaGestion.tipo === 'WHATSAPP' ? <MessageCircle size={16} color="#25D366" /> : <Mail size={16} color="#0288d1" />}
                            <Typography variant="body2" sx={{ fontWeight: 700, color: policy.ultimaGestion.tipo === 'WHATSAPP' ? '#25D366' : '#0288d1' }}>
                              {policy.ultimaGestion.tipo === 'WHATSAPP'
                                ? `WhatsApp (${policy.ultimaGestion.whatsappCount})`
                                : `Mail (${policy.ultimaGestion.mailCount})`}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {format(parseISO(policy.ultimaGestion.fecha), 'dd/MM/yyyy')}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', minWidth: 220 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(96px, 1fr))', gap: 0.75 }}>
                        <Button size="small" variant="outlined" color="success" startIcon={<MessageCircle size={14} />} onClick={() => onWhatsApp(policy)} sx={{ justifyContent: 'flex-start', fontWeight: 700 }}>
                          WhatsApp
                        </Button>
                        <Button size="small" variant="outlined" color="primary" startIcon={<Edit2 size={14} />} onClick={() => onEdit(policy)} sx={{ justifyContent: 'flex-start', fontWeight: 700 }}>
                          Modificar
                        </Button>
                        <Button size="small" variant="outlined" color="info" startIcon={<Mail size={14} />} onClick={() => onEmail(policy)} sx={{ justifyContent: 'flex-start', fontWeight: 700 }}>
                          Mail
                        </Button>
                        <Button size="small" variant="outlined" color="error" startIcon={<Trash2 size={14} />} onClick={() => onDelete(policy)} sx={{ justifyContent: 'flex-start', fontWeight: 700 }}>
                          Eliminar
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              {visiblePolicies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontWeight: 600 }}>
                    No hay datos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

const LifeFinanceTable = ({
  policies,
  showAll,
  onToggleShowAll,
  onWhatsApp,
  onEmail,
}: any) => (
  <Card sx={{ mb: 4 }}>
    <CardContent>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Polizas de Vida y Finanzas (Total: {policies.length})
        </Typography>
        {policies.length > VISIBLE_POLICIES_LIMIT && (
          <Button size="small" onClick={onToggleShowAll}>
            {showAll ? 'Ver menos' : 'Ver todas'}
          </Button>
        )}
      </Box>
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'error.main' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Cliente</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Tipo</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Aseguradora</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Detalle</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Email</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'right' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(showAll ? policies : policies.slice(0, VISIBLE_POLICIES_LIMIT)).map((policy: any) => (
              <TableRow key={policy.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{policy.cliente}</TableCell>
                <TableCell>{policy.tipo === 'VIDA' ? 'Vida' : 'Retiro'}</TableCell>
                <TableCell>{policy.aseguradora}</TableCell>
                <TableCell>
                  {policy.tipo === 'VIDA'
                    ? `Suma asegurada: ${formatMoney(policy.sumaAsegurada)}`
                    : `Aporte mensual: ${formatMoney(policy.aporteMensual)} | Fondo: ${formatMoney(policy.fondoAcumulado)}`}
                </TableCell>
                <TableCell>{policy.email || '-'}</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <IconButton size="small" color="success" onClick={() => onWhatsApp(policy)}>
                    <MessageCircle size={18} />
                  </IconButton>
                  <IconButton size="small" color="primary" onClick={() => onEmail(policy)}>
                    <Mail size={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {policies.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontWeight: 600 }}>
                  No hay datos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent>
  </Card>
);

function getEditValues(policy: DashboardPolicy): EditFormValues {
  return {
    clienteNombre: policy.clienteNombre || policy.cliente,
    clienteDni: policy.clienteDni || '',
    clienteTelefono: policy.telefono || '',
    clienteEmail: policy.email || '',
    clienteDireccion: policy.direccion || '',
    clienteAltura: policy.altura || '',
    clienteCp: policy.cp || '',
    clienteProvincia: policy.provincia || '',
    clienteLocalidad: policy.localidad || '',
    aseguradora: policy.aseguradora || '',
    rubro: policy.rubro || '',
    numeroPoliza: policy.poliza || '',
    fechaInicio: policy.inicio || '',
    fechaVencimiento: policy.vencimiento || '',
    medioPago: policy.medioPago || 'Cupon',
    vigencia: policy.vigencia || 'ANUAL',
    prima: String(policy.prima || 0),
    porcentajeComision: String(policy.porcentajeComision || 0),
    moneda: policy.moneda || 'ARS',
    pagada: policy.pagada,
    fechaPago: policy.fechaPago || '',
  };
}

function buildPolicyPayload(policy: DashboardPolicy, values: EditFormValues): PolicyPayload {
  const tipo = classifyGeneralPolicyTypeFromRubro(values.rubro);
  return {
    clienteId: tipo === 'INDIVIDUAL' ? policy.clienteId : null,
    companyId: tipo === 'EMPRESA' ? policy.companyId : null,
    clienteNombre: values.clienteNombre,
    clienteDni: values.clienteDni,
    clienteTelefono: values.clienteTelefono,
    clienteEmail: values.clienteEmail,
    clienteDireccion: values.clienteDireccion,
    clienteAltura: values.clienteAltura,
    clienteCp: values.clienteCp,
    clienteProvincia: values.clienteProvincia,
    clienteLocalidad: values.clienteLocalidad,
    aseguradora: values.aseguradora,
    rubro: values.rubro,
    numeroPoliza: values.numeroPoliza,
    fechaInicio: values.fechaInicio,
    fechaVencimiento: values.fechaVencimiento,
    medioPago: values.medioPago,
    vigencia: values.vigencia,
    cuotaActual: policy.cuotaActual || 1,
    cuotaTotal: policy.cuotaTotal || getQuotaTotalFromVigencia(values.vigencia),
    groupId: policy.groupId || policy.id,
    pagada: values.pagada,
    fechaPago: values.pagada ? values.fechaPago : '',
    prima: Number(values.prima || 0),
    porcentajeComision: Number(values.porcentajeComision || 0),
    moneda: values.moneda || 'ARS',
    tipo,
  };
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const filter = searchParams.get('filter');

  const [stats, setStats] = useState({ polizasActivas: 0, vencen7Dias: 0, polizasVencidas: 0, clientesTotales: 0 });
  const [policies, setPolicies] = useState<DashboardPolicy[]>([]);
  const [lifePolicies, setLifePolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState({ clients: false, companies: false, lifeFinance: false });
  const [editingPolicy, setEditingPolicy] = useState<DashboardPolicy | null>(null);
  const [editValues, setEditValues] = useState<EditFormValues | null>(null);
  const [manualVencimiento, setManualVencimiento] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error'; message: string }>({
    open: false,
    severity: 'success',
    message: '',
  });

  const loadDashboardData = useCallback(async (withLoading = true) => {
    if (withLoading) setLoading(true);
    try {
      const [s, p] = await Promise.all([
        api.dashboard.stats(),
        api.dashboard.policies(filter || undefined),
      ]);
      setStats(s);
      setPolicies(p);

      try {
        const lp = await api.lifePolicies.list();
        setLifePolicies(lp);
      } catch (lifeError) {
        console.warn('No se pudieron cargar las polizas de Vida y Finanzas:', lifeError);
        setLifePolicies([]);
      }
    } catch (error) {
      console.error(error);
      setSnack({
        open: true,
        severity: 'error',
        message: error instanceof Error ? error.message : 'No se pudo cargar el dashboard.',
      });
    } finally {
      if (withLoading) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!editValues || manualVencimiento) return;
    if (editValues.fechaInicio && editValues.vigencia) {
      setEditValues((prev) => prev ? { ...prev, fechaVencimiento: calculateVencimiento(prev.fechaInicio, prev.vigencia) } : prev);
    }
  }, [editValues?.fechaInicio, editValues?.vigencia, manualVencimiento]);

  const individualPolicies = useMemo(() => policies.filter((policy) => policy.tipo === 'INDIVIDUAL'), [policies]);
  const companyPolicies = useMemo(() => policies.filter((policy) => policy.tipo === 'EMPRESA'), [policies]);

  const applyFilter = (newFilter: string | null) => {
    navigate(newFilter ? `/dashboard?filter=${newFilter}` : '/dashboard');
  };

  const statCards = [
    { title: 'Polizas Activas', value: stats.polizasActivas, icon: <FileCheck size={24} />, color: 'primary', onClick: () => applyFilter(filter === 'active' ? null : 'active'), active: filter === 'active' },
    { title: 'Vencen en 7 dias', value: stats.vencen7Dias, icon: <Clock size={24} />, color: 'warning', subtitle: 'Requieren atencion', onClick: () => applyFilter(filter === 'expiring' ? null : 'expiring'), active: filter === 'expiring' },
    { title: 'Polizas Vencidas', value: stats.polizasVencidas, icon: <AlertCircle size={24} />, color: 'error', subtitle: 'Accion inmediata', onClick: () => applyFilter(filter === 'expired' ? null : 'expired'), active: filter === 'expired' },
    { title: 'Clientes Totales', value: stats.clientesTotales, icon: <Users size={24} />, color: 'info', subtitle: 'Cartera activa' },
    { title: 'Vida y Finanzas', value: lifePolicies.length, icon: <HeartPulse size={24} />, color: 'secondary', subtitle: 'Total de polizas', onClick: () => navigate('/vida-finanzas') },
  ];

  const handleWhatsApp = async (policy: DashboardPolicy) => {
    try {
      await api.policies.trackInteraction(policy.id, 'WHATSAPP');
      await loadDashboardData(false);
    } catch (error) {
      console.error(error);
    }

    const pasName = user?.nombre || 'Tu Productor';
    const message = `Hola ${policy.cliente}, te informamos que tu poliza N° ${policy.poliza} vence el dia ${format(parseISO(policy.vencimiento), 'dd/MM/yyyy')}. Por favor, contactanos para renovarla. Saludos, ${pasName} - PAS Alert.`;
    const phone = policy.telefono ? policy.telefono.replace(/\D/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleEmail = async (policy: DashboardPolicy) => {
    try {
      await api.policies.trackInteraction(policy.id, 'EMAIL');
      await loadDashboardData(false);
    } catch (error) {
      console.error(error);
    }

    const pasName = user?.nombre || 'Tu Productor';
    const subject = `Aviso de vencimiento - Poliza N° ${policy.poliza}`;
    const body = `Hola ${policy.cliente},\n\nTe informamos que tu poliza N° ${policy.poliza} vence el dia ${format(parseISO(policy.vencimiento), 'dd/MM/yyyy')}.\n\nPor favor, contactanos para renovarla.\n\nSaludos,\n${pasName}\nPAS Alert`;
    window.open(`mailto:${policy.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleLifeWhatsApp = (policy: any) => {
    const pasName = user?.nombre || 'Tu Productor';
    const policyType = policy.tipo === 'VIDA' ? 'Vida' : 'Retiro';
    const message = `Hola ${policy.cliente}, te contactamos por tu poliza de ${policyType} con ${policy.aseguradora}. Si queres revisar cobertura o actualizar datos, escribinos. Saludos, ${pasName} - PAS Alert.`;
    const phone = policy.telefono ? policy.telefono.replace(/\D/g, '') : '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleLifeEmail = (policy: any) => {
    const pasName = user?.nombre || 'Tu Productor';
    const policyType = policy.tipo === 'VIDA' ? 'Vida' : 'Retiro';
    const subject = `Seguimiento de poliza de ${policyType}`;
    const body = `Hola ${policy.cliente},\n\nTe contactamos para dar seguimiento a tu poliza de ${policyType} con ${policy.aseguradora}.\n\nSi queres revisar cobertura o actualizar datos, responde este correo.\n\nSaludos,\n${pasName}\nPAS Alert`;
    window.open(`mailto:${policy.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleTogglePaid = async (policy: DashboardPolicy) => {
    try {
      await api.policies.updatePayment(policy.id, {
        pagada: !policy.pagada,
        fechaPago: !policy.pagada ? new Date().toISOString().split('T')[0] : '',
      });
      await loadDashboardData(false);
    } catch (error: any) {
      setSnack({ open: true, severity: 'error', message: error.message || 'No se pudo actualizar el estado de pago.' });
    }
  };

  const handleUpdatePaymentDate = async (policy: DashboardPolicy, date: string) => {
    try {
      await api.policies.updatePayment(policy.id, {
        pagada: true,
        fechaPago: date,
      });
      await loadDashboardData(false);
    } catch (error: any) {
      setSnack({ open: true, severity: 'error', message: error.message || 'No se pudo guardar la fecha de pago.' });
    }
  };

  const handleDelete = async (policy: DashboardPolicy) => {
    if (!window.confirm(`¿Seguro que queres eliminar la poliza ${policy.poliza}?`)) return;

    try {
      await api.policies.delete(policy.id);
      await loadDashboardData(false);
      setSnack({ open: true, severity: 'success', message: 'Poliza eliminada.' });
    } catch (error: any) {
      setSnack({ open: true, severity: 'error', message: error.message || 'No se pudo eliminar la poliza.' });
    }
  };

  const handleEdit = (policy: DashboardPolicy) => {
    setEditingPolicy(policy);
    setEditValues(getEditValues(policy));
    setManualVencimiento(false);
  };

  const handleSaveEdit = async () => {
    if (!editingPolicy || !editValues) return;

    setSavingEdit(true);
    try {
      const payload = buildPolicyPayload(editingPolicy, editValues);
      await api.policies.update(editingPolicy.id, payload);
      setEditingPolicy(null);
      setEditValues(null);
      await loadDashboardData(false);
      setSnack({ open: true, severity: 'success', message: 'Poliza actualizada correctamente.' });
    } catch (error: any) {
      setSnack({ open: true, severity: 'error', message: error.message || 'No se pudo actualizar la poliza.' });
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>Panel de Control</Typography>
          <Typography variant="body1" color="text.secondary">Bienvenido de nuevo. Aqui tienes un resumen de tu actividad.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {filter && (
            <Button variant="outlined" color="error" startIcon={<X size={20} />} onClick={() => navigate('/dashboard')}>
              Quitar Filtro
            </Button>
          )}
          <Button variant="contained" startIcon={<Plus size={20} />} onClick={() => navigate('/polizas')} sx={{ px: 3, py: 1.5, borderRadius: 3 }}>
            Nueva Poliza
          </Button>
        </Box>
      </Box>

      {filter && (
        <Box sx={{ mb: 3 }}>
          <Alert
            severity={filter === 'expired' ? 'error' : filter === 'expiring' ? 'warning' : 'info'}
            sx={{ borderRadius: 2 }}
            action={(
              <Button color="inherit" size="small" onClick={() => navigate('/dashboard')}>
                Ver todas
              </Button>
            )}
          >
            {filter === 'expiring' && 'Mostrando solo polizas que vencen en los proximos 7 dias.'}
            {filter === 'expired' && 'Mostrando solo polizas vencidas.'}
            {filter === 'active' && 'Mostrando solo polizas activas.'}
          </Alert>
        </Box>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Box>
          <PolicyTable
            title={`Gestion de Polizas de Clientes (Total: ${individualPolicies.length})`}
            policies={individualPolicies}
            onWhatsApp={handleWhatsApp}
            onEmail={handleEmail}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onTogglePaid={handleTogglePaid}
            onUpdatePaymentDate={handleUpdatePaymentDate}
            headerColor="primary.main"
            showAll={showAll.clients}
            totalCount={individualPolicies.length}
            onToggleShowAll={() => setShowAll((prev) => ({ ...prev, clients: !prev.clients }))}
          />
          <PolicyTable
            title={`Gestion de Polizas de Empresas (Total: ${companyPolicies.length})`}
            policies={companyPolicies}
            onWhatsApp={handleWhatsApp}
            onEmail={handleEmail}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onTogglePaid={handleTogglePaid}
            onUpdatePaymentDate={handleUpdatePaymentDate}
            headerColor="secondary.main"
            showAll={showAll.companies}
            totalCount={companyPolicies.length}
            onToggleShowAll={() => setShowAll((prev) => ({ ...prev, companies: !prev.companies }))}
          />
          <LifeFinanceTable
            policies={lifePolicies}
            showAll={showAll.lifeFinance}
            onToggleShowAll={() => setShowAll((prev) => ({ ...prev, lifeFinance: !prev.lifeFinance }))}
            onWhatsApp={handleLifeWhatsApp}
            onEmail={handleLifeEmail}
          />
      </Box>


      <Dialog open={!!editingPolicy && !!editValues} onClose={() => { setEditingPolicy(null); setEditValues(null); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Poliza</DialogTitle>
        {editValues && (
          <>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label={classifyGeneralPolicyTypeFromRubro(editValues.rubro) === 'EMPRESA' ? 'Empresa / Razon Social' : 'Nombre Completo'} value={editValues.clienteNombre} onChange={(event) => setEditValues((prev) => prev ? { ...prev, clienteNombre: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth label={classifyGeneralPolicyTypeFromRubro(editValues.rubro) === 'EMPRESA' ? 'CUIT' : 'DNI'} value={editValues.clienteDni} onChange={(event) => setEditValues((prev) => prev ? { ...prev, clienteDni: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth label="Telefono" value={editValues.clienteTelefono} onChange={(event) => setEditValues((prev) => prev ? { ...prev, clienteTelefono: event.target.value } : prev)} InputProps={{ startAdornment: <InputAdornment position="start"><Phone size={16} /></InputAdornment> }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Email" type="email" value={editValues.clienteEmail} onChange={(event) => setEditValues((prev) => prev ? { ...prev, clienteEmail: event.target.value } : prev)} InputProps={{ startAdornment: <InputAdornment position="start"><Mail size={16} /></InputAdornment> }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Calle" value={editValues.clienteDireccion} onChange={(event) => setEditValues((prev) => prev ? { ...prev, clienteDireccion: event.target.value } : prev)} InputProps={{ startAdornment: <InputAdornment position="start"><MapPin size={16} /></InputAdornment> }} />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField fullWidth label="N°" value={editValues.clienteAltura} onChange={(event) => setEditValues((prev) => prev ? { ...prev, clienteAltura: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Codigo Postal" value={editValues.clienteCp} onChange={(event) => setEditValues((prev) => prev ? { ...prev, clienteCp: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Autocomplete
                    options={PROVINCIAS_ARGENTINA}
                    value={editValues.clienteProvincia || null}
                    onChange={(_, value) => setEditValues((prev) => prev ? { ...prev, clienteProvincia: value || '' } : prev)}
                    renderInput={(params) => <TextField {...params} label="Provincia" />}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Localidad" value={editValues.clienteLocalidad} onChange={(event) => setEditValues((prev) => prev ? { ...prev, clienteLocalidad: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Autocomplete
                    freeSolo
                    options={GENERAL_RUBRO_OPTIONS}
                    groupBy={(option) => (typeof option === 'string' ? 'Otros' : option.category)}
                    getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                    value={GENERAL_RUBRO_OPTIONS.find((option) => option.label === editValues.rubro) || editValues.rubro}
                    onChange={(_, value) => {
                      const rubro = typeof value === 'string' ? value : value?.label || '';
                      setEditValues((prev) => prev ? { ...prev, rubro } : prev);
                    }}
                    onInputChange={(_, value) => setEditValues((prev) => prev ? { ...prev, rubro: value || '' } : prev)}
                    renderInput={(params) => <TextField {...params} label="Rubro" />}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Autocomplete
                    freeSolo
                    options={ASEGURADORAS}
                    value={editValues.aseguradora}
                    onChange={(_, value) => setEditValues((prev) => prev ? { ...prev, aseguradora: value || '' } : prev)}
                    onInputChange={(_, value) => setEditValues((prev) => prev ? { ...prev, aseguradora: value || '' } : prev)}
                    renderInput={(params) => <TextField {...params} label="Aseguradora" />}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Numero de Poliza" value={editValues.numeroPoliza} onChange={(event) => setEditValues((prev) => prev ? { ...prev, numeroPoliza: event.target.value } : prev)} InputProps={{ startAdornment: <InputAdornment position="start"><Hash size={16} /></InputAdornment> }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="date" label="Fecha Inicio" InputLabelProps={{ shrink: true }} value={editValues.fechaInicio} onChange={(event) => setEditValues((prev) => prev ? { ...prev, fechaInicio: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth type="date" label="Fecha Vencimiento" InputLabelProps={{ shrink: true }} value={editValues.fechaVencimiento} onChange={(event) => {
                    setManualVencimiento(true);
                    setEditValues((prev) => prev ? { ...prev, fechaVencimiento: event.target.value } : prev);
                  }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth select label="Medio de Pago" value={editValues.medioPago} onChange={(event) => setEditValues((prev) => prev ? { ...prev, medioPago: event.target.value } : prev)}>
                    {PAYMENT_OPTIONS.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    select
                    label="Vigencia"
                    value={editValues.vigencia}
                    onChange={(event) => {
                      setManualVencimiento(false);
                      setEditValues((prev) => prev ? { ...prev, vigencia: event.target.value as PolicyVigencia } : prev);
                    }}
                  >
                    {VIGENCIA_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Prima" value={formatAmountInput(editValues.prima)} onChange={(event) => setEditValues((prev) => prev ? { ...prev, prima: parseAmountInput(event.target.value) } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select fullWidth label="Moneda"
                    value={editValues.moneda || 'ARS'}
                    onChange={(event) => setEditValues((prev) => prev ? { ...prev, moneda: event.target.value } : prev)}
                  >
                    <MenuItem value="ARS">ARS — Peso Argentino</MenuItem>
                    <MenuItem value="USD">USD — Dólar</MenuItem>
                    <MenuItem value="EUR">EUR — Euro</MenuItem>
                    <MenuItem value="BRL">BRL — Real</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Porcentaje Comision (%)" type="number" value={editValues.porcentajeComision} onChange={(event) => setEditValues((prev) => prev ? { ...prev, porcentajeComision: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton onClick={() => setEditValues((prev) => prev ? { ...prev, pagada: !prev.pagada } : prev)} sx={{ color: editValues.pagada ? 'success.main' : 'text.disabled' }}>
                      {editValues.pagada ? <CheckSquare size={22} /> : <Square size={22} />}
                    </IconButton>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{editValues.pagada ? 'Marcada como pagada' : 'Pendiente de pago'}</Typography>
                  </Box>
                </Grid>
                {editValues.pagada && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth type="date" label="Fecha de Pago" InputLabelProps={{ shrink: true }} value={editValues.fechaPago} onChange={(event) => setEditValues((prev) => prev ? { ...prev, fechaPago: event.target.value } : prev)} />
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => { setEditingPolicy(null); setEditValues(null); }}>Cancelar</Button>
              <Button variant="contained" onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((prev) => ({ ...prev, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
