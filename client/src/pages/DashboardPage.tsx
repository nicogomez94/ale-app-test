import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
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
  Collapse,
} from '@mui/material';
import {
  AlertCircle,
  Banknote,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Clock,
  CreditCard,
  FileCheck,
  FileDown,
  Filter,
  Hash,
  Landmark,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Square,
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
import { ListingActions } from '../components/ListingActions';
import { PolicyCouponDialog } from '../components/PolicyCouponDialog';
import { PolicyFormDialog } from '../components/PolicyFormDialog';
import { printTableReport } from '../utils/reportExports';

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

type LifePolicyEditValues = {
  cliente: string;
  cuit: string;
  aseguradora: string;
  tipo: 'VIDA' | 'RETIRO';
  sumaAsegurada: string;
  prima: string;
  aporteMensual: string;
  fondoAcumulado: string;
  email: string;
  telefono: string;
  direccion: string;
  cp: string;
  localidad: string;
  provincia: string;
};

const StatCard = ({ title, value, icon, color, subtitle, onClick, active }: any) => (
  <Card
    sx={{
      height: '100%',
      minWidth: 0,
      minHeight: { xs: 108, md: 92, lg: 108 },
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
    <CardContent sx={{ p: { xs: 2, md: 1.5, lg: 2 }, '&:last-child': { pb: { xs: 2, md: 1.5, lg: 2 } } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', fontWeight: 700, letterSpacing: { xs: 1, md: 0.7, lg: 1 }, lineHeight: 1.15, fontSize: { md: '0.68rem', lg: '0.75rem' }, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{title}</Typography>
          <Typography variant="h5" sx={{ mt: { xs: 0.75, md: 0.5 }, fontWeight: 800, lineHeight: 1, fontSize: { md: '1.55rem', lg: '1.7rem' } }}>{value}</Typography>
        </Box>
        <Box
          sx={{
            width: { xs: 40, md: 32, lg: 38 },
            height: { xs: 40, md: 32, lg: 38 },
            borderRadius: '50%',
            bgcolor: `${color}.main`,
            color: 'common.white',
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& svg': { color: 'common.white' },
          }}
        >
          {icon}
        </Box>
      </Box>
      {subtitle && <Typography variant="caption" color="text.secondary" sx={{ mt: { xs: 1.5, md: 1 }, display: 'block', fontSize: { md: '0.68rem', lg: '0.75rem' } }}>{subtitle}</Typography>}
    </CardContent>
  </Card>
);

const DetailField = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 800, textTransform: 'uppercase', letterSpacing: .55 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ mt: .35, fontWeight: 650, overflowWrap: 'anywhere' }}>
      {value || '-'}
    </Typography>
  </Box>
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

const getErrorMessage = (error: unknown, fallback: string) => (
  error instanceof Error && error.message ? error.message : fallback
);

const parseOptionalNumber = (value: string) => {
  const cleaned = value.trim();
  if (!cleaned) return undefined;

  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
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

type PaymentFilter = 'ALL' | 'CASH' | 'BANK' | 'CARD';

const normalizeFilterText = (value?: string | null) => (value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const matchesPaymentFilter = (policy: DashboardPolicy, paymentFilter: PaymentFilter) => {
  if (paymentFilter === 'ALL') return true;
  const paymentMethod = normalizeFilterText(policy.medioPago);
  if (paymentFilter === 'CASH') return paymentMethod.includes('cupon') || paymentMethod.includes('efectivo');
  if (paymentFilter === 'BANK') return paymentMethod.includes('cbu') || paymentMethod.includes('debito') || paymentMethod.includes('bancario');
  return paymentMethod.includes('tarjeta') || paymentMethod.includes('credito');
};

const getPolicyRowSx = (policy: DashboardPolicy, accentColor?: string) => {
  const backgroundColor = policy.pagada
    ? 'rgba(46, 125, 50, 0.09)'
    : policy.estado === 'VENCIDA'
      ? 'rgba(211, 47, 47, 0.09)'
      : 'transparent';
  const hoverColor = policy.pagada
    ? 'rgba(46, 125, 50, 0.15)'
    : policy.estado === 'VENCIDA'
      ? 'rgba(211, 47, 47, 0.15)'
      : 'action.hover';

  return {
    cursor: 'pointer',
    borderLeft: '4px solid',
    borderLeftColor: policy.pagada ? 'success.main' : policy.estado === 'VENCIDA' ? 'error.main' : accentColor || 'transparent',
    '& > td': { bgcolor: backgroundColor, transition: 'background-color .18s ease' },
    '&:hover > td': { bgcolor: hoverColor },
  };
};

const getSequentiallyVisiblePolicies = (policies: DashboardPolicy[]) => {
  const sortedPolicies = [...policies].sort((a, b) => a.cuotaActual - b.cuotaActual);
  const firstUnpaidIndex = sortedPolicies.findIndex((policy) => !policy.pagada);
  return firstUnpaidIndex === -1 ? sortedPolicies : sortedPolicies.slice(0, firstUnpaidIndex + 1);
};

const PaymentStatusControl = ({
  policy,
  onTogglePaid,
  onUpdatePaymentDate,
}: {
  policy: DashboardPolicy;
  onTogglePaid: (policy: DashboardPolicy) => void;
  onUpdatePaymentDate: (policy: DashboardPolicy, date: string) => void;
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <IconButton
        size="small"
        onClick={(event) => {
          event.stopPropagation();
          onTogglePaid(policy);
        }}
        aria-label={policy.pagada ? `Marcar cuota ${policy.cuota} como no pagada` : `Marcar cuota ${policy.cuota} como pagada`}
        sx={{ color: policy.pagada ? 'success.main' : 'text.disabled' }}
      >
        {policy.pagada ? <CheckSquare size={22} /> : <Square size={22} />}
      </IconButton>
      <Typography variant="body2" sx={{ fontWeight: 700, color: policy.pagada ? 'success.main' : 'text.secondary' }}>
        {policy.pagada ? 'SI' : 'NO'}
      </Typography>
    </Box>
    {policy.pagada && (
      <>
        <TextField
          type="date"
          size="small"
          value={policy.fechaPago || ''}
          onChange={(event) => onUpdatePaymentDate(policy, event.target.value)}
          onClick={(event) => event.stopPropagation()}
          inputProps={{ 'aria-label': `Fecha de pago de la cuota ${policy.cuota}` }}
          sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem', p: '6px 8px', width: '110px' } }}
        />
        <Typography variant="caption" sx={{ fontWeight: 800, color: 'success.dark' }}>
          Prima: {formatMoney(policy.prima)}
        </Typography>
      </>
    )}
  </Box>
);

const PolicyTable = ({
  title,
  policies,
  onWhatsApp,
  onCoupon,
  onDocument,
  onEmail,
  onDelete,
  onEdit,
  onTogglePaid,
  onUpdatePaymentDate,
  onView,
  headerColor,
  showAll,
  onToggleShowAll,
  onCreate,
}: {
  title: string;
  policies: DashboardPolicy[];
  onWhatsApp: (policy: DashboardPolicy) => void;
  onCoupon: (policy: DashboardPolicy) => void;
  onDocument: (policy: DashboardPolicy) => void;
  onEmail: (policy: DashboardPolicy) => void;
  onDelete: (policy: DashboardPolicy) => void;
  onEdit: (policy: DashboardPolicy) => void;
  onTogglePaid: (policy: DashboardPolicy) => void;
  onUpdatePaymentDate: (policy: DashboardPolicy, date: string) => void;
  onView: (policy: DashboardPolicy) => void;
  headerColor: string;
  showAll: boolean;
  onToggleShowAll: () => void;
  onCreate: () => void;
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sectionOpen, setSectionOpen] = useState(true);
  const groupedPolicies = useMemo(() => {
    const groups = new Map<string, { key: string; cliente: string; policies: DashboardPolicy[] }>();
    policies.forEach((policy) => {
      const key = policy.groupId || policy.id;
      const group = groups.get(key) || { key, cliente: policy.cliente, policies: [] };
      group.policies.push(policy);
      groups.set(key, group);
    });
    return Array.from(groups.values()).map((group) => ({
      ...group,
      policies: getSequentiallyVisiblePolicies(group.policies),
    }));
  }, [policies]);
  const visibleGroups = showAll ? groupedPolicies : groupedPolicies.slice(0, VISIBLE_POLICIES_LIMIT);
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const handleToggleGroupPayment = (policy: DashboardPolicy, groupKey: string) => {
    if (!policy.pagada) {
      setExpandedGroups((prev) => new Set(prev).add(groupKey));
    }
    onTogglePaid(policy);
  };

  return (
    <Card sx={{ mb: 4, minWidth: 0, maxWidth: '100%' }}>
      <CardContent sx={{ px: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
        <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>{title}</Typography>
            <Chip label={`${groupedPolicies.length} pólizas`} size="small" sx={{ fontWeight: 800 }} />
            <Button variant="contained" size="small" startIcon={<Plus size={18} />} onClick={onCreate} sx={{ borderRadius: 3, px: 2 }}>
              Nueva Póliza
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={sectionOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              onClick={() => setSectionOpen((open) => !open)}
              sx={{ borderRadius: 3, fontWeight: 800 }}
            >
              {sectionOpen ? `Esconder (${groupedPolicies.length})` : `Desplegar (${groupedPolicies.length})`}
            </Button>
            {groupedPolicies.length > VISIBLE_POLICIES_LIMIT && (
              <Button size="small" onClick={onToggleShowAll}>
                {showAll ? 'Ver menos' : 'Ver todas'}
              </Button>
            )}
          </Box>
        </Box>
        <Collapse in={sectionOpen} timeout="auto">
        <TableContainer component={Paper} elevation={0} sx={{ width: '100%', maxWidth: '100%', overflowX: 'auto', border: '1px solid', borderColor: 'divider' }}>
          <Table sx={{ minWidth: 1080 }}>
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
              {visibleGroups.map((group) => {
                return (
                  <React.Fragment key={group.key}>
                  {group.policies.slice(0, 1).map((policy) => {
                    const status = getStatusVisual(policy);
                    const isExpanded = expandedGroups.has(group.key);
                    return (
                  <TableRow key={policy.id} hover onClick={() => onView(policy)} sx={getPolicyRowSx(policy, headerColor)}>
                    <TableCell sx={{ fontWeight: 600, minWidth: 220 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {group.policies.length > 1 && (
                          <IconButton size="small" onClick={(event) => { event.stopPropagation(); toggleGroup(group.key); }}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </IconButton>
                        )}
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{policy.cliente}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                            Poliza: {policy.poliza}
                          </Typography>
                          <Chip
                            label={policy.aseguradora}
                            size="small"
                            sx={{ bgcolor: '#1a237e', color: 'white', fontWeight: 700, fontSize: '0.65rem', height: 20, mt: 0.5, borderRadius: 1 }}
                          />
                          {policy.cuotaTotal > 1 && (
                            <Chip label={`${policy.cuotaTotal} en cascada`} size="small" variant="outlined" sx={{ ml: 0.75, height: 20, fontWeight: 700 }} />
                          )}
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', mt: 0.5 }}>
                            {policy.tipo === 'EMPRESA' ? 'EMPRESA' : 'INDIVIDUAL'}
                          </Typography>
                          {normalizeFilterText(policy.medioPago).includes('cupon') && (
                            <Box sx={{ mt: .8, display: 'flex', alignItems: 'center', gap: .7, flexWrap: 'wrap' }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: policy.coupon ? 'success.main' : 'warning.main' }} />
                              <Typography variant="caption" sx={{ color: policy.coupon ? 'success.dark' : 'warning.dark', fontWeight: 900 }}>
                                {policy.coupon ? 'Cupón cargado' : 'Cupón pendiente'}
                              </Typography>
                              <Button
                                size="small"
                                variant="outlined"
                                color={policy.coupon ? 'success' : 'primary'}
                                startIcon={<MessageCircle size={13} />}
                                onClick={(event) => { event.stopPropagation(); onWhatsApp(policy); }}
                                sx={{ minHeight: 24, py: .15, px: 1, fontSize: '.67rem' }}
                              >
                                {policy.coupon ? 'Enviar cupón' : 'Cargar y enviar'}
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </Box>
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
                      <PaymentStatusControl
                        policy={policy}
                        onTogglePaid={(selectedPolicy) => handleToggleGroupPayment(selectedPolicy, group.key)}
                        onUpdatePaymentDate={onUpdatePaymentDate}
                      />
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
                      <ListingActions
                        onCoupon={() => onCoupon(policy)}
                        hasCoupon={Boolean(policy.coupon)}
                        onDocument={() => onDocument(policy)}
                        hasDocument={Boolean(policy.policyDocument)}
                        onWhatsApp={() => onWhatsApp(policy)}
                        onEmail={() => onEmail(policy)}
                        onEdit={() => onEdit(policy)}
                        onDelete={() => onDelete(policy)}
                        disableWhatsApp={!policy.coupon || !policy.telefono}
                        whatsappTitle={!policy.coupon ? 'Cargá una cuponera antes de enviar' : !policy.telefono ? 'La póliza no tiene un teléfono válido' : 'Enviar cuponera por Meta WhatsApp'}
                      />
                    </TableCell>
                  </TableRow>
                    );
                  })}
                  {group.policies.length > 1 && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                        <Collapse in={expandedGroups.has(group.key)} timeout="auto" unmountOnExit>
                          <Box sx={{ m: 2, p: 2, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 800, color: 'primary.main' }}>
                              Detalle de pólizas en cascada
                            </Typography>
                            <Table size="small">
                              <TableBody>
                                {group.policies.slice(1).map((policy) => {
                                  const status = getStatusVisual(policy);
                                  return (
                                    <TableRow key={policy.id} hover onClick={() => onView(policy)} sx={getPolicyRowSx(policy)}>
                                      <TableCell sx={{ minWidth: 220 }}>
                                        <Typography variant="body2" fontWeight={800}>{policy.poliza}</Typography>
                                        <Typography variant="caption" color="text.secondary">{policy.aseguradora} · {policy.rubro}</Typography>
                                      </TableCell>
                                      <TableCell align="center">{policy.inicio ? format(parseISO(policy.inicio), 'dd/MM/yyyy') : '-'}</TableCell>
                                      <TableCell align="center">{format(parseISO(policy.vencimiento), 'dd/MM/yyyy')}</TableCell>
                                      <TableCell align="center"><Chip label={status.label} size="small" sx={{ bgcolor: status.color, color: status.textColor, fontWeight: 700 }} /></TableCell>
                                      <TableCell align="center">{policy.cuota}</TableCell>
                                      <TableCell align="center" sx={{ minWidth: 150 }}>
                                        <PaymentStatusControl
                                          policy={policy}
                                          onTogglePaid={(selectedPolicy) => handleToggleGroupPayment(selectedPolicy, group.key)}
                                          onUpdatePaymentDate={onUpdatePaymentDate}
                                        />
                                      </TableCell>
                                      <TableCell align="right">
                                        <ListingActions
                                          onCoupon={() => onCoupon(policy)}
                                          hasCoupon={Boolean(policy.coupon)}
                                          onDocument={() => onDocument(policy)}
                                          hasDocument={Boolean(policy.policyDocument)}
                                          onWhatsApp={() => onWhatsApp(policy)}
                                          onEmail={() => onEmail(policy)}
                                          onEdit={() => onEdit(policy)}
                                          onDelete={() => onDelete(policy)}
                                          disableWhatsApp={!policy.coupon || !policy.telefono}
                                          whatsappTitle={!policy.coupon ? 'Cargá una cuponera antes de enviar' : !policy.telefono ? 'La póliza no tiene un teléfono válido' : 'Enviar cuponera por Meta WhatsApp'}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                  </React.Fragment>
                );
              })}
              {visibleGroups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontWeight: 600 }}>
                    No hay datos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </Collapse>
      </CardContent>
    </Card>
  );
};

const LifeFinanceTable = ({
  policies,
  showAll,
  onToggleShowAll,
  onCreate,
  onView,
  onWhatsApp,
  onEmail,
  onEdit,
  onDelete,
}: {
  policies: any[];
  showAll: boolean;
  onToggleShowAll: () => void;
  onCreate: () => void;
  onView: (policy: any) => void;
  onWhatsApp: (policy: any) => void;
  onEmail: (policy: any) => void;
  onEdit: (policy: any) => void;
  onDelete: (policy: any) => void;
}) => {
  const [sectionOpen, setSectionOpen] = useState(true);

  return (
    <Card sx={{ mb: 4, minWidth: 0, maxWidth: '100%' }}>
      <CardContent sx={{ px: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
        <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>Gestión de Pólizas de Vida y Retiro</Typography>
            <Chip label={`${policies.length} pólizas`} size="small" sx={{ fontWeight: 800 }} />
            <Button variant="contained" color="error" size="small" startIcon={<Plus size={18} />} onClick={onCreate} sx={{ borderRadius: 3, px: 2 }}>
              Nueva Póliza
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={sectionOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              onClick={() => setSectionOpen((open) => !open)}
              sx={{ borderRadius: 3, fontWeight: 800 }}
            >
              {sectionOpen ? `Esconder (${policies.length})` : `Desplegar (${policies.length})`}
            </Button>
            {policies.length > VISIBLE_POLICIES_LIMIT && (
              <Button size="small" onClick={onToggleShowAll}>{showAll ? 'Ver menos' : 'Ver todas'}</Button>
            )}
          </Box>
        </Box>
        <Collapse in={sectionOpen} timeout="auto">
          <TableContainer component={Paper} elevation={0} sx={{ width: '100%', maxWidth: '100%', overflowX: 'auto', border: '1px solid', borderColor: 'divider' }}>
        <Table sx={{ minWidth: 980 }}>
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
              <TableRow key={policy.id} hover onClick={() => onView(policy)} sx={{ cursor: 'pointer' }}>
                <TableCell sx={{ fontWeight: 600 }}>{policy.cliente}</TableCell>
                <TableCell>{policy.tipo === 'VIDA' ? 'Vida' : 'Retiro'}</TableCell>
                <TableCell>{policy.aseguradora}</TableCell>
                <TableCell>
                  {policy.tipo === 'VIDA'
                    ? `Suma asegurada: ${formatMoney(policy.sumaAsegurada)}`
                    : `Aporte mensual: ${formatMoney(policy.aporteMensual)} | Fondo: ${formatMoney(policy.fondoAcumulado)}`}
                </TableCell>
                <TableCell>{policy.email || '-'}</TableCell>
                <TableCell sx={{ textAlign: 'right', minWidth: 220 }}>
                  <ListingActions
                    onWhatsApp={() => onWhatsApp(policy)}
                    onEmail={() => onEmail(policy)}
                    onEdit={() => onEdit(policy)}
                    onDelete={() => onDelete(policy)}
                  />
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
        </Collapse>
      </CardContent>
    </Card>
  );
};

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
    prima: Number(values.prima || 0),
    premioTotal: policy.premioTotal ?? null,
    cobertura: policy.cobertura ?? null,
    endoso: policy.endoso ?? null,
    patente: policy.patente ?? null,
    chasis: policy.chasis ?? null,
    motor: policy.motor ?? null,
    direccionRiesgo: policy.direccionRiesgo ?? null,
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
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL');
  const [policySearch, setPolicySearch] = useState('');
  const [detailPolicy, setDetailPolicy] = useState<DashboardPolicy | null>(null);
  const [detailLifePolicy, setDetailLifePolicy] = useState<any | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<DashboardPolicy | null>(null);
  const [editValues, setEditValues] = useState<EditFormValues | null>(null);
  const [manualVencimiento, setManualVencimiento] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingLifePolicy, setEditingLifePolicy] = useState<any | null>(null);
  const [lifeEditValues, setLifeEditValues] = useState<LifePolicyEditValues | null>(null);
  const [savingLifeEdit, setSavingLifeEdit] = useState(false);
  const [couponPolicy, setCouponPolicy] = useState<DashboardPolicy | null>(null);
  const [couponPromptSend, setCouponPromptSend] = useState(false);
  const [createPolicy, setCreatePolicy] = useState<{ mode: 'CLIENTE' | 'EMPRESA' | 'VIDA_RETIRO' } | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error'; message: string }>({
    open: false,
    severity: 'success',
    message: '',
  });

  const loadDashboardData = useCallback(async (withLoading = true) => {
    if (withLoading) setLoading(true);
    const [statsResult, policiesResult, lifePoliciesResult] = await Promise.allSettled([
      api.dashboard.stats(),
      api.dashboard.policies(filter || undefined),
      api.lifePolicies.list(),
    ]);

    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value);
    }

    if (policiesResult.status === 'fulfilled') {
      setPolicies(policiesResult.value);
    } else {
      console.error('Dashboard policies error:', policiesResult.reason);
      setPolicies([]);
    }

    if (lifePoliciesResult.status === 'fulfilled') {
      setLifePolicies(lifePoliciesResult.value);
    } else {
      console.warn('No se pudieron cargar las pólizas de Vida y Retiro:', lifePoliciesResult.reason);
      setLifePolicies([]);
    }

    if (statsResult.status === 'rejected' || policiesResult.status === 'rejected') {
      if (statsResult.status === 'rejected') {
        console.error('Dashboard stats error:', statsResult.reason);
      }

      const failedParts = [
        statsResult.status === 'rejected'
          ? `estadisticas: ${getErrorMessage(statsResult.reason, 'error desconocido')}`
          : null,
        policiesResult.status === 'rejected'
          ? `polizas: ${getErrorMessage(policiesResult.reason, 'error desconocido')}`
          : null,
      ].filter(Boolean);

      setSnack({
        open: true,
        severity: 'error',
        message: `No se pudo cargar parte del dashboard (${failedParts.join(' | ')}).`,
      });
    }

    if (withLoading) setLoading(false);
    else window.dispatchEvent(new Event('pas-alert:refresh-counts'));
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

  const countPolicyGroups = useCallback((items: DashboardPolicy[]) => (
    new Set(items.map((policy) => policy.groupId || policy.id)).size
  ), []);
  const paymentCounts = useMemo(() => ({
    ALL: countPolicyGroups(policies),
    CASH: countPolicyGroups(policies.filter((policy) => matchesPaymentFilter(policy, 'CASH'))),
    BANK: countPolicyGroups(policies.filter((policy) => matchesPaymentFilter(policy, 'BANK'))),
    CARD: countPolicyGroups(policies.filter((policy) => matchesPaymentFilter(policy, 'CARD'))),
  }), [countPolicyGroups, policies]);
  const filteredPolicies = useMemo(() => {
    const search = normalizeFilterText(policySearch);
    return policies.filter((policy) => {
      if (!matchesPaymentFilter(policy, paymentFilter)) return false;
      if (!search) return true;
      const searchableText = normalizeFilterText([
        policy.cliente,
        policy.poliza,
        policy.cp,
        policy.aseguradora,
        policy.clienteDni,
        policy.rubro,
      ].join(' '));
      return searchableText.includes(search);
    });
  }, [paymentFilter, policies, policySearch]);
  const filteredLifePolicies = useMemo(() => {
    const search = normalizeFilterText(policySearch);
    if (!search) return lifePolicies;
    return lifePolicies.filter((policy) => normalizeFilterText([
      policy.cliente,
      policy.cuit,
      policy.aseguradora,
      policy.tipo,
      policy.cp,
    ].join(' ')).includes(search));
  }, [lifePolicies, policySearch]);
  const individualPolicies = useMemo(() => filteredPolicies.filter((policy) => policy.tipo === 'INDIVIDUAL'), [filteredPolicies]);
  const companyPolicies = useMemo(() => filteredPolicies.filter((policy) => policy.tipo === 'EMPRESA'), [filteredPolicies]);

  const applyFilter = (newFilter: string | null) => {
    navigate(newFilter ? `/dashboard?filter=${newFilter}` : '/dashboard');
  };

  const statCards = [
    { title: 'Polizas Activas', value: stats.polizasActivas, icon: <FileCheck size={20} />, color: 'primary', onClick: () => applyFilter(filter === 'active' ? null : 'active'), active: filter === 'active' },
    { title: 'Vencen en 7 dias', value: stats.vencen7Dias, icon: <Clock size={20} />, color: 'warning', subtitle: 'Requieren atencion', onClick: () => applyFilter(filter === 'expiring' ? null : 'expiring'), active: filter === 'expiring' },
    { title: 'Polizas Vencidas', value: stats.polizasVencidas, icon: <AlertCircle size={20} />, color: 'error', subtitle: 'Accion inmediata', onClick: () => applyFilter(filter === 'expired' ? null : 'expired'), active: filter === 'expired' },
    { title: 'Clientes Totales', value: stats.clientesTotales, icon: <Users size={20} />, color: 'info', subtitle: 'Cartera activa' },
  ];
  const paymentFilterOptions: Array<{ value: PaymentFilter; label: string; icon: React.ReactNode }> = [
    { value: 'ALL', label: 'Todas', icon: <FileCheck size={16} /> },
    { value: 'CASH', label: 'Cupón / Efectivo', icon: <Banknote size={16} /> },
    { value: 'BANK', label: 'Débito CBU / Bancario', icon: <Landmark size={16} /> },
    { value: 'CARD', label: 'Tarjeta de Crédito', icon: <CreditCard size={16} /> },
  ];

  const handleCoupon = (policy: DashboardPolicy, promptSend = false) => {
    setCouponPromptSend(promptSend);
    setCouponPolicy(policy);
  };

  const handlePolicyDocumentDownload = async (policy: DashboardPolicy) => {
    try {
      const blob = await api.policyDocuments.download(policy.groupId || policy.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = policy.policyDocument?.originalName || `poliza-${policy.poliza}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setSnack({ open: true, severity: 'error', message: err.message || 'No se pudo descargar el PDF original.' });
    }
  };

  const handleWhatsApp = (policy: DashboardPolicy) => {
    handleCoupon(policy, true);
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

  const getLifeEditValues = (policy: any): LifePolicyEditValues => ({
    cliente: policy.cliente || '',
    cuit: policy.cuit || '',
    aseguradora: policy.aseguradora || '',
    tipo: policy.tipo === 'RETIRO' ? 'RETIRO' : 'VIDA',
    sumaAsegurada: policy.sumaAsegurada != null ? String(policy.sumaAsegurada) : '',
    prima: policy.prima != null ? String(policy.prima) : '',
    aporteMensual: policy.aporteMensual != null ? String(policy.aporteMensual) : '',
    fondoAcumulado: policy.fondoAcumulado != null ? String(policy.fondoAcumulado) : '',
    email: policy.email || '',
    telefono: policy.telefono || '',
    direccion: policy.direccion || '',
    cp: policy.cp || '',
    localidad: policy.localidad || '',
    provincia: policy.provincia || '',
  });

  const handleLifeEdit = (policy: any) => {
    setEditingLifePolicy(policy);
    setLifeEditValues(getLifeEditValues(policy));
  };

  const handleLifeDelete = async (policy: any) => {
    if (!window.confirm(`¿Seguro que queres eliminar la poliza de ${policy.cliente}?`)) return;

    try {
      await api.lifePolicies.delete(policy.id);
      await loadDashboardData(false);
      setSnack({ open: true, severity: 'success', message: 'Póliza de Vida y Retiro eliminada.' });
    } catch (error: any) {
      setSnack({ open: true, severity: 'error', message: error.message || 'No se pudo eliminar la póliza.' });
    }
  };

  const handleSaveLifeEdit = async () => {
    if (!editingLifePolicy || !lifeEditValues) return;

    setSavingLifeEdit(true);
    try {
      await api.lifePolicies.update(editingLifePolicy.id, {
        cliente: lifeEditValues.cliente.trim(),
        cuit: lifeEditValues.cuit.trim(),
        aseguradora: lifeEditValues.aseguradora.trim(),
        tipo: lifeEditValues.tipo,
        sumaAsegurada: parseOptionalNumber(lifeEditValues.sumaAsegurada),
        prima: parseOptionalNumber(lifeEditValues.prima),
        aporteMensual: parseOptionalNumber(lifeEditValues.aporteMensual),
        fondoAcumulado: parseOptionalNumber(lifeEditValues.fondoAcumulado),
        email: lifeEditValues.email.trim() || undefined,
        telefono: lifeEditValues.telefono.trim() || undefined,
        direccion: lifeEditValues.direccion.trim() || undefined,
        cp: lifeEditValues.cp.trim() || undefined,
        localidad: lifeEditValues.localidad.trim() || undefined,
        provincia: lifeEditValues.provincia.trim() || undefined,
      });
      setEditingLifePolicy(null);
      setLifeEditValues(null);
      await loadDashboardData(false);
      setSnack({ open: true, severity: 'success', message: 'Póliza de Vida y Retiro actualizada correctamente.' });
    } catch (error: any) {
      setSnack({ open: true, severity: 'error', message: error.message || 'No se pudo actualizar la póliza.' });
    } finally {
      setSavingLifeEdit(false);
    }
  };

  const handleTogglePaid = async (policy: DashboardPolicy) => {
    try {
      const result = await api.policies.updatePayment(policy.id, {
        pagada: !policy.pagada,
        fechaPago: !policy.pagada ? new Date().toISOString().split('T')[0] : '',
      });
      await loadDashboardData(false);
      if (result.nextQuotaCreated) {
        setSnack({ open: true, severity: 'success', message: `Próxima cuota generada (${result.nextQuotaPolicies?.[0]?.cuota || 'siguiente'}).` });
      } else if (result.renewalCreated) {
        setSnack({ open: true, severity: 'success', message: `Renovacion generada con ${result.renewalPolicies.length} cuota(s).` });
      }
    } catch (error: any) {
      setSnack({ open: true, severity: 'error', message: error.message || 'No se pudo actualizar el estado de pago.' });
    }
  };

  const handleUpdatePaymentDate = async (policy: DashboardPolicy, date: string) => {
    try {
      const result = await api.policies.updatePayment(policy.id, {
        pagada: true,
        fechaPago: date,
      });
      await loadDashboardData(false);
      if (result.nextQuotaCreated) {
        setSnack({ open: true, severity: 'success', message: `Próxima cuota generada (${result.nextQuotaPolicies?.[0]?.cuota || 'siguiente'}).` });
      } else if (result.renewalCreated) {
        setSnack({ open: true, severity: 'success', message: `Renovacion generada con ${result.renewalPolicies.length} cuota(s).` });
      }
    } catch (error: any) {
      setSnack({ open: true, severity: 'error', message: error.message || 'No se pudo guardar la fecha de pago.' });
    }
  };

  const handleDelete = async (policy: DashboardPolicy) => {
    if (!window.confirm(`¿Eliminar la póliza ${policy.poliza}, todas sus cuotas, su cuponera y el historial de envíos?`)) return;

    try {
      await api.policies.delete(policy.id);
      await loadDashboardData(false);
      setSnack({ open: true, severity: 'success', message: 'Póliza, cuotas y documentos asociados eliminados.' });
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

  const exportPdf = () => printTableReport('Panel de Control · Pólizas', policies, [
    { label: 'Cliente / Empresa', value: (p) => p.cliente }, { label: 'Póliza', value: (p) => p.poliza }, { label: 'Aseguradora', value: (p) => p.aseguradora },
    { label: 'Rubro', value: (p) => p.rubro }, { label: 'Vencimiento', value: (p) => p.vencimiento }, { label: 'Estado', value: (p) => p.pagada ? 'Pagada' : p.estadoLabel }, { label: 'Pago', value: (p) => p.medioPago },
  ]);

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, minWidth: 0 }}>
        <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, fontSize: { xs: '2rem', sm: '2.125rem' }, overflowWrap: 'anywhere' }}>Panel de Control</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>Bienvenido de nuevo. Aqui tienes un resumen de tu actividad.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
          <Button variant="outlined" color="error" startIcon={<FileDown size={19} />} onClick={exportPdf}>Exportar PDF</Button>
          {filter && (
            <Button variant="outlined" color="error" startIcon={<X size={20} />} onClick={() => navigate('/dashboard')}>
              Quitar Filtro
            </Button>
          )}
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          gap: { xs: 2, md: 1.5, lg: 2 },
          mb: 3,
          minWidth: 0,
        }}
      >
        {statCards.map((stat, index) => (
          <Box key={index} sx={{ minWidth: 0 }}>
            <StatCard {...stat} />
          </Box>
        ))}
      </Box>

      <Card sx={{ mb: 3, borderRadius: 4 }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: { xs: 'stretch', lg: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                <Filter size={20} color="#1a237e" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Filtrar por forma de pago</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {paymentFilterOptions.map((option) => (
                  <Button
                    key={option.value}
                    size="small"
                    variant={paymentFilter === option.value ? 'contained' : 'outlined'}
                    startIcon={option.icon}
                    onClick={() => setPaymentFilter(option.value)}
                    sx={{ borderRadius: 999, fontWeight: 800, textTransform: 'none' }}
                  >
                    {option.label} ({paymentCounts[option.value]})
                  </Button>
                ))}
              </Box>
            </Box>
            <TextField
              size="small"
              value={policySearch}
              onChange={(event) => setPolicySearch(event.target.value)}
              placeholder="Buscar cliente, N° póliza, C.P...."
              inputProps={{ 'aria-label': 'Buscar pólizas en el dashboard' }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search size={19} /></InputAdornment>,
                endAdornment: policySearch ? (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label="Limpiar búsqueda" onClick={() => setPolicySearch('')}><X size={16} /></IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
              sx={{ width: { xs: '100%', lg: 390 }, '& .MuiOutlinedInput-root': { borderRadius: 999 } }}
            />
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
          <PolicyTable
            title="Gestión de Pólizas de Clientes"
            policies={individualPolicies}
            onWhatsApp={handleWhatsApp}
            onCoupon={handleCoupon}
            onDocument={handlePolicyDocumentDownload}
            onEmail={handleEmail}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onTogglePaid={handleTogglePaid}
            onUpdatePaymentDate={handleUpdatePaymentDate}
            onView={setDetailPolicy}
            headerColor="primary.main"
            showAll={showAll.clients}
            onToggleShowAll={() => setShowAll((prev) => ({ ...prev, clients: !prev.clients }))}
            onCreate={() => setCreatePolicy({ mode: 'CLIENTE' })}
          />
          <PolicyTable
            title="Gestión de Pólizas de Empresas"
            policies={companyPolicies}
            onWhatsApp={handleWhatsApp}
            onCoupon={handleCoupon}
            onDocument={handlePolicyDocumentDownload}
            onEmail={handleEmail}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onTogglePaid={handleTogglePaid}
            onUpdatePaymentDate={handleUpdatePaymentDate}
            onView={setDetailPolicy}
            headerColor="secondary.main"
            showAll={showAll.companies}
            onToggleShowAll={() => setShowAll((prev) => ({ ...prev, companies: !prev.companies }))}
            onCreate={() => setCreatePolicy({ mode: 'EMPRESA' })}
          />
          <LifeFinanceTable
            policies={filteredLifePolicies}
            showAll={showAll.lifeFinance}
            onToggleShowAll={() => setShowAll((prev) => ({ ...prev, lifeFinance: !prev.lifeFinance }))}
            onCreate={() => setCreatePolicy({ mode: 'VIDA_RETIRO' })}
            onView={setDetailLifePolicy}
            onWhatsApp={handleLifeWhatsApp}
            onEmail={handleLifeEmail}
            onEdit={handleLifeEdit}
            onDelete={handleLifeDelete}
          />
      </Box>

      <Drawer
        anchor="right"
        open={Boolean(detailPolicy)}
        onClose={() => setDetailPolicy(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, maxWidth: '100%', p: 0 } }}
      >
        {detailPolicy && (
          <Box sx={{ minHeight: '100%', bgcolor: 'background.default' }}>
            <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white', position: 'relative' }}>
              <IconButton aria-label="Cerrar detalle" onClick={() => setDetailPolicy(null)} sx={{ position: 'absolute', right: 14, top: 14, color: 'white' }}>
                <X size={21} />
              </IconButton>
              <Typography variant="overline" sx={{ opacity: .78, fontWeight: 800 }}>Detalle de póliza</Typography>
              <Typography variant="h5" sx={{ mt: .5, pr: 5, fontWeight: 850 }}>{detailPolicy.cliente}</Typography>
              <Typography variant="body2" sx={{ mt: .5, opacity: .88 }}>N° {detailPolicy.poliza}</Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              <Chip
                label={getStatusVisual(detailPolicy).label}
                sx={{ mb: 3, bgcolor: getStatusVisual(detailPolicy).color, color: getStatusVisual(detailPolicy).textColor, fontWeight: 850 }}
              />
              <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 850 }}>Datos principales</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
                <DetailField label="Tipo" value={detailPolicy.tipo === 'EMPRESA' ? 'Empresa' : 'Cliente'} />
                <DetailField label="DNI / CUIT" value={detailPolicy.clienteDni} />
                <DetailField label="Aseguradora" value={detailPolicy.aseguradora} />
                <DetailField label="Rubro" value={detailPolicy.rubro} />
                <DetailField label="Inicio" value={detailPolicy.inicio ? format(parseISO(detailPolicy.inicio), 'dd/MM/yyyy') : '-'} />
                <DetailField label="Vencimiento" value={format(parseISO(detailPolicy.vencimiento), 'dd/MM/yyyy')} />
                <DetailField label="Vigencia" value={detailPolicy.vigenciaLabel} />
                <DetailField label="Cuota" value={`${detailPolicy.cuota} · ${detailPolicy.medioPago || 'Sin informar'}`} />
                <DetailField label="Pago" value={detailPolicy.pagada ? `Pagada${detailPolicy.fechaPago ? ` el ${format(parseISO(detailPolicy.fechaPago), 'dd/MM/yyyy')}` : ''}` : 'Pendiente'} />
                <DetailField label="Prima" value={`${detailPolicy.moneda || 'ARS'} ${formatMoney(detailPolicy.prima)}`} />
                <DetailField label="Comisión" value={`${detailPolicy.porcentajeComision || 0}% · ${formatMoney(detailPolicy.comisionCalculada)}`} />
                <DetailField label="Última gestión" value={detailPolicy.ultimaGestion ? `${detailPolicy.ultimaGestion.tipo} · ${format(parseISO(detailPolicy.ultimaGestion.fecha), 'dd/MM/yyyy')}` : 'Sin gestiones'} />
              </Box>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 850 }}>Contacto y riesgo</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
                <DetailField label="Teléfono" value={detailPolicy.telefono} />
                <DetailField label="Email" value={detailPolicy.email} />
                <DetailField label="Dirección" value={[detailPolicy.direccion, detailPolicy.altura].filter(Boolean).join(' ')} />
                <DetailField label="Localidad" value={[detailPolicy.cp, detailPolicy.localidad, detailPolicy.provincia].filter(Boolean).join(' · ')} />
                <DetailField label="Patente" value={detailPolicy.patente} />
                <DetailField label="Endoso" value={detailPolicy.endoso} />
                <DetailField label="Chasis" value={detailPolicy.chasis} />
                <DetailField label="Motor" value={detailPolicy.motor} />
                <DetailField label="Cobertura" value={detailPolicy.cobertura} />
                <DetailField label="Dirección del riesgo" value={detailPolicy.direccionRiesgo} />
              </Box>
              <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="contained" onClick={() => { const policy = detailPolicy; setDetailPolicy(null); handleEdit(policy); }}>Modificar</Button>
                <Button variant="outlined" onClick={() => { const policy = detailPolicy; setDetailPolicy(null); handleCoupon(policy); }}>
                  {detailPolicy.coupon ? 'Ver cuponera' : 'Cargar cuponera'}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>

      <Drawer
        anchor="right"
        open={Boolean(detailLifePolicy)}
        onClose={() => setDetailLifePolicy(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, maxWidth: '100%', p: 0 } }}
      >
        {detailLifePolicy && (
          <Box sx={{ minHeight: '100%', bgcolor: 'background.default' }}>
            <Box sx={{ p: 3, bgcolor: 'error.main', color: 'white', position: 'relative' }}>
              <IconButton aria-label="Cerrar detalle" onClick={() => setDetailLifePolicy(null)} sx={{ position: 'absolute', right: 14, top: 14, color: 'white' }}><X size={21} /></IconButton>
              <Typography variant="overline" sx={{ opacity: .8, fontWeight: 800 }}>Vida y Retiro</Typography>
              <Typography variant="h5" sx={{ mt: .5, pr: 5, fontWeight: 850 }}>{detailLifePolicy.cliente}</Typography>
              <Typography variant="body2" sx={{ mt: .5, opacity: .88 }}>{detailLifePolicy.tipo === 'VIDA' ? 'Seguro de Vida' : 'Seguro de Retiro'}</Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
                <DetailField label="CUIT" value={detailLifePolicy.cuit} />
                <DetailField label="Aseguradora" value={detailLifePolicy.aseguradora} />
                <DetailField label="Suma asegurada" value={formatMoney(detailLifePolicy.sumaAsegurada)} />
                <DetailField label="Prima" value={formatMoney(detailLifePolicy.prima)} />
                <DetailField label="Aporte mensual" value={formatMoney(detailLifePolicy.aporteMensual)} />
                <DetailField label="Fondo acumulado" value={formatMoney(detailLifePolicy.fondoAcumulado)} />
                <DetailField label="Teléfono" value={detailLifePolicy.telefono} />
                <DetailField label="Email" value={detailLifePolicy.email} />
                <DetailField label="Dirección" value={detailLifePolicy.direccion} />
                <DetailField label="Localidad" value={[detailLifePolicy.cp, detailLifePolicy.localidad, detailLifePolicy.provincia].filter(Boolean).join(' · ')} />
              </Box>
              <Button sx={{ mt: 3 }} variant="contained" color="error" onClick={() => { const policy = detailLifePolicy; setDetailLifePolicy(null); handleLifeEdit(policy); }}>
                Modificar
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>


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

      <Dialog open={!!editingLifePolicy && !!lifeEditValues} onClose={() => { setEditingLifePolicy(null); setLifeEditValues(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Póliza de Vida y Retiro</DialogTitle>
        {lifeEditValues && (
          <>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Cliente" value={lifeEditValues.cliente} onChange={(event) => setLifeEditValues((prev) => prev ? { ...prev, cliente: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="CUIT" value={lifeEditValues.cuit} onChange={(event) => setLifeEditValues((prev) => prev ? { ...prev, cuit: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth select label="Tipo" value={lifeEditValues.tipo} onChange={(event) => setLifeEditValues((prev) => prev ? { ...prev, tipo: event.target.value as 'VIDA' | 'RETIRO' } : prev)}>
                    <MenuItem value="VIDA">Seguros de Vida</MenuItem>
                    <MenuItem value="RETIRO">Seguros de Retiro</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Aseguradora" value={lifeEditValues.aseguradora} onChange={(event) => setLifeEditValues((prev) => prev ? { ...prev, aseguradora: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Suma Asegurada" type="number" value={lifeEditValues.sumaAsegurada} onChange={(event) => setLifeEditValues((prev) => prev ? { ...prev, sumaAsegurada: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Prima" type="number" value={lifeEditValues.prima} onChange={(event) => setLifeEditValues((prev) => prev ? { ...prev, prima: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Aporte Mensual" type="number" value={lifeEditValues.aporteMensual} onChange={(event) => setLifeEditValues((prev) => prev ? { ...prev, aporteMensual: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Fondo Acumulado" type="number" value={lifeEditValues.fondoAcumulado} onChange={(event) => setLifeEditValues((prev) => prev ? { ...prev, fondoAcumulado: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Email" type="email" value={lifeEditValues.email} onChange={(event) => setLifeEditValues((prev) => prev ? { ...prev, email: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Teléfono" value={lifeEditValues.telefono} onChange={(event) => setLifeEditValues((prev) => prev ? { ...prev, telefono: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Dirección" value={lifeEditValues.direccion} onChange={(event) => setLifeEditValues((prev) => prev ? { ...prev, direccion: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Código Postal" value={lifeEditValues.cp} onChange={(event) => setLifeEditValues((prev) => prev ? { ...prev, cp: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Localidad" value={lifeEditValues.localidad} onChange={(event) => setLifeEditValues((prev) => prev ? { ...prev, localidad: event.target.value } : prev)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Provincia" value={lifeEditValues.provincia} onChange={(event) => setLifeEditValues((prev) => prev ? { ...prev, provincia: event.target.value } : prev)} />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => { setEditingLifePolicy(null); setLifeEditValues(null); }}>Cancelar</Button>
              <Button variant="contained" onClick={handleSaveLifeEdit} disabled={savingLifeEdit}>
                {savingLifeEdit ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <PolicyCouponDialog
        open={Boolean(couponPolicy)}
        policy={couponPolicy}
        initialSend={couponPromptSend}
        onClose={() => {
          setCouponPolicy(null);
          setCouponPromptSend(false);
        }}
        onChanged={() => loadDashboardData(false)}
        onNotify={(severity, message) => setSnack({ open: true, severity, message })}
      />

      <PolicyFormDialog
        open={Boolean(createPolicy)}
        mode={createPolicy?.mode}
        onClose={() => setCreatePolicy(null)}
        onSaved={async () => {
          setCreatePolicy(null);
          await loadDashboardData(false);
          setSnack({ open: true, severity: 'success', message: 'Póliza guardada correctamente.' });
        }}
      />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((prev) => ({ ...prev, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
