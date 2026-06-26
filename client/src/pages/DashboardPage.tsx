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
} from '@mui/material';
import {
  AlertCircle,
  CheckSquare,
  Clock,
  FileCheck,
  Hash,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
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
  const [detailGroup, setDetailGroup] = useState<{ key: string; cliente: string; policies: DashboardPolicy[] } | null>(null);
  const groupedPolicies = useMemo(() => {
    const groups = new Map<string, { key: string; cliente: string; policies: DashboardPolicy[] }>();
    policies.forEach((policy) => {
      const key = policy.clienteId || policy.companyId || policy.cliente;
      const group = groups.get(key) || { key, cliente: policy.cliente, policies: [] };
      group.policies.push(policy);
      groups.set(key, group);
    });
    return Array.from(groups.values()).map((group) => ({
      ...group,
      policies: [...group.policies].sort((a, b) => a.vencimiento.localeCompare(b.vencimiento)),
    }));
  }, [policies]);
  const visibleGroups = showAll ? groupedPolicies : groupedPolicies.slice(0, VISIBLE_POLICIES_LIMIT);

  return (
    <Card sx={{ mb: 4, minWidth: 0, maxWidth: '100%' }}>
      <CardContent sx={{ px: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
        <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{title}</Typography>
          {groupedPolicies.length > VISIBLE_POLICIES_LIMIT && (
            <Button size="small" onClick={onToggleShowAll}>
              {showAll ? 'Ver menos' : 'Ver todas'}
            </Button>
          )}
        </Box>
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
                const policy = group.policies[0];
                const status = getStatusVisual(policy);

                return (
                  <TableRow key={group.key} hover onClick={() => setDetailGroup(group)} sx={{ cursor: 'pointer' }}>
                    <TableCell sx={{ fontWeight: 600, minWidth: 220 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{policy.cliente}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                        {group.policies.length === 1 ? `Poliza: ${policy.poliza}` : `${group.policies.length} polizas en cascada`}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                        {group.policies.slice(0, 3).map((item) => (
                          <Chip key={item.id} label={`${item.poliza} · ${item.aseguradora}`} size="small" variant="outlined" />
                        ))}
                        {group.policies.length > 3 && <Chip label={`+${group.policies.length - 3}`} size="small" />}
                      </Box>
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
                          <>
                            <TextField
                              type="date"
                              size="small"
                              value={policy.fechaPago || ''}
                              onChange={(event) => onUpdatePaymentDate(policy, event.target.value)}
                              sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem', p: '6px 8px', width: '110px' } }}
                            />
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'success.dark' }}>
                              Prima: {formatMoney(policy.prima)}
                            </Typography>
                          </>
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
                      <ListingActions
                        onWhatsApp={() => onWhatsApp(policy)}
                        onEmail={() => onEmail(policy)}
                        onEdit={() => onEdit(policy)}
                        onDelete={() => onDelete(policy)}
                      />
                    </TableCell>
                  </TableRow>
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
      </CardContent>
      <Drawer anchor="right" open={!!detailGroup} onClose={() => setDetailGroup(null)}>
        <Box sx={{ width: { xs: 340, sm: 460 }, maxWidth: '100vw', p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>{detailGroup?.cliente}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {detailGroup?.policies.length || 0} póliza(s) asociadas
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {detailGroup?.policies.map((item) => {
            const itemStatus = getStatusVisual(item);
            return (
              <Card key={item.id} variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1 }}>
                    <Box>
                      <Typography fontWeight={900}>{item.poliza}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.aseguradora} · {item.rubro}</Typography>
                    </Box>
                    <Chip label={itemStatus.label} size="small" />
                  </Box>
                  <Typography variant="body2">Vigencia: {format(parseISO(item.inicio), 'dd/MM/yyyy')} - {format(parseISO(item.vencimiento), 'dd/MM/yyyy')}</Typography>
                  <Typography variant="body2">Cuota: {item.cuota} · {item.medioPago || '-'}</Typography>
                  <Typography variant="body2">Prima: {formatMoney(item.prima)} · Comisión: {formatMoney(item.comisionCalculada)}</Typography>
                  <Box sx={{ mt: 2 }}>
                    <ListingActions
                      onWhatsApp={() => onWhatsApp(item)}
                      onEmail={() => onEmail(item)}
                      onEdit={() => onEdit(item)}
                      onDelete={() => onDelete(item)}
                    />
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Drawer>
    </Card>
  );
};

const LifeFinanceTable = ({
  policies,
  showAll,
  onToggleShowAll,
  onWhatsApp,
  onEmail,
  onEdit,
  onDelete,
}: {
  policies: any[];
  showAll: boolean;
  onToggleShowAll: () => void;
  onWhatsApp: (policy: any) => void;
  onEmail: (policy: any) => void;
  onEdit: (policy: any) => void;
  onDelete: (policy: any) => void;
}) => (
  <Card sx={{ mb: 4, minWidth: 0, maxWidth: '100%' }}>
    <CardContent sx={{ px: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5, minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
          Pólizas de Vida y Retiro (Total: {policies.length})
        </Typography>
        {policies.length > VISIBLE_POLICIES_LIMIT && (
          <Button size="small" onClick={onToggleShowAll}>
            {showAll ? 'Ver menos' : 'Ver todas'}
          </Button>
        )}
      </Box>
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
  const [editingLifePolicy, setEditingLifePolicy] = useState<any | null>(null);
  const [lifeEditValues, setLifeEditValues] = useState<LifePolicyEditValues | null>(null);
  const [savingLifeEdit, setSavingLifeEdit] = useState(false);
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
    { title: 'Polizas Activas', value: stats.polizasActivas, icon: <FileCheck size={20} />, color: 'primary', onClick: () => applyFilter(filter === 'active' ? null : 'active'), active: filter === 'active' },
    { title: 'Vencen en 7 dias', value: stats.vencen7Dias, icon: <Clock size={20} />, color: 'warning', subtitle: 'Requieren atencion', onClick: () => applyFilter(filter === 'expiring' ? null : 'expiring'), active: filter === 'expiring' },
    { title: 'Polizas Vencidas', value: stats.polizasVencidas, icon: <AlertCircle size={20} />, color: 'error', subtitle: 'Accion inmediata', onClick: () => applyFilter(filter === 'expired' ? null : 'expired'), active: filter === 'expired' },
    { title: 'Clientes Totales', value: stats.clientesTotales, icon: <Users size={20} />, color: 'info', subtitle: 'Cartera activa' },
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
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, minWidth: 0 }}>
        <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, fontSize: { xs: '2rem', sm: '2.125rem' }, overflowWrap: 'anywhere' }}>Panel de Control</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>Bienvenido de nuevo. Aqui tienes un resumen de tu actividad.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
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

      <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
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
          {/* La gestión de Vida y Retiro queda en su módulo específico para reducir densidad del dashboard. */}
          {false && <LifeFinanceTable
            policies={lifePolicies}
            showAll={showAll.lifeFinance}
            onToggleShowAll={() => setShowAll((prev) => ({ ...prev, lifeFinance: !prev.lifeFinance }))}
            onWhatsApp={handleLifeWhatsApp}
            onEmail={handleLifeEmail}
            onEdit={handleLifeEdit}
            onDelete={handleLifeDelete}
          />}
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

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((prev) => ({ ...prev, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
