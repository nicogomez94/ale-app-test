import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
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
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Edit,
  Eye,
  FileText,
  FileUp,
  Filter,
  History,
  MoreVertical,
  PieChart as PieIcon,
  Plus,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { differenceInDays, format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

type InvoiceStatus = 'Pendiente' | 'Facturada' | 'Cobrada' | 'Parcial' | 'Vencida';

type ExtendedInvoice = {
  id: string;
  aseguradoraId: string;
  insurerName: string;
  periodo: string;
  numeroFactura: string;
  fechaEmision: string;
  vencimiento: string;
  montoEsperado: number;
  montoFacturado: number;
  montoCobrado: number;
  estado: InvoiceStatus;
  diferenciaDetectada: boolean;
  notas: string;
  moneda: string;
  pagos: Array<{ id: string; fecha: string; monto: number }>;
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  Pendiente: '#64748b',
  Facturada: '#3b82f6',
  Cobrada: '#10b981',
  Parcial: '#f59e0b',
  Vencida: '#ef4444',
};

const RUBROS = ['Automotores', 'Hogar', 'Vida', 'Retiro', 'ART', 'Comercio', 'Responsabilidad Civil'];

const today = () => new Date().toISOString().split('T')[0];

const parseDate = (value: string) => {
  const parsed = value ? parseISO(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const toStatus = (status: string): InvoiceStatus => {
  const normalized = status || 'PENDIENTE';
  if (normalized === 'FACTURADA') return 'Facturada';
  if (normalized === 'COBRADA') return 'Cobrada';
  if (normalized === 'PARCIAL') return 'Parcial';
  if (normalized === 'VENCIDA') return 'Vencida';
  return 'Pendiente';
};

const money = (value: number) => `$ ${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const CommissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openConfigDialog, setOpenConfigDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ExtendedInvoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({ monto: '', fechaPago: today(), medioPago: 'Transferencia' });
  const [savingPayment, setSavingPayment] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [invoiceData, insurerData] = await Promise.all([
        api.commissions.invoices.list(),
        api.directory.insurers.list(),
      ]);
      setInvoices(invoiceData);
      setInsurers(insurerData);
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudieron cargar las comisiones.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const allInvoices = useMemo<ExtendedInvoice[]>(() => {
    return invoices.map((invoice) => ({
      id: invoice.id,
      aseguradoraId: invoice.insuranceCompanyId || '',
      insurerName: invoice.insuranceCompany?.razonSocial || 'Sin aseguradora',
      periodo: invoice.periodo || '',
      numeroFactura: invoice.numeroFactura || 'S/N',
      fechaEmision: invoice.fechaEmision || today(),
      vencimiento: invoice.fechaVencimiento || invoice.fechaEmision || today(),
      montoEsperado: Number(invoice.montoEsperado || invoice.monto || 0),
      montoFacturado: Number(invoice.monto || 0),
      montoCobrado: Number(invoice.montoCobrado || 0),
      estado: toStatus(invoice.estadoCalculado || invoice.estado),
      diferenciaDetectada: Boolean(invoice.diferenciaDetectada),
      notas: invoice.notes || '',
      moneda: invoice.moneda || 'ARS',
      pagos: (invoice.payments || []).map((payment: any) => ({
        id: payment.id,
        fecha: payment.fechaPago || today(),
        monto: Number(payment.monto || 0),
      })),
    }));
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((invoice) => {
      const normalizedSearch = searchTerm.toLowerCase();
      const matchesSearch =
        invoice.insurerName.toLowerCase().includes(normalizedSearch) ||
        invoice.numeroFactura.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all' || invoice.estado === statusFilter;
      const matchesCompany = companyFilter === 'all' || invoice.aseguradoraId === companyFilter;
      return matchesSearch && matchesStatus && matchesCompany;
    });
  }, [allInvoices, searchTerm, statusFilter, companyFilter]);

  const stats = useMemo(() => {
    const totalExpected = allInvoices.reduce((acc, invoice) => acc + invoice.montoEsperado, 0);
    const totalBilled = allInvoices.reduce((acc, invoice) => acc + invoice.montoFacturado, 0);
    const totalCollected = allInvoices.reduce((acc, invoice) => acc + invoice.montoCobrado, 0);
    const totalPending = totalBilled - totalCollected;
    const totalDifferences = allInvoices.filter((invoice) => invoice.diferenciaDetectada).length;
    const collectedInvoices = allInvoices.filter((invoice) => invoice.estado === 'Cobrada' && invoice.pagos.length > 0);
    const avgCollectionDays = collectedInvoices.length > 0
      ? Math.round(collectedInvoices.reduce((acc, invoice) => {
          const emitDate = parseDate(invoice.fechaEmision);
          const lastPaymentDate = parseDate(invoice.pagos[invoice.pagos.length - 1].fecha);
          return acc + differenceInDays(lastPaymentDate, emitDate);
        }, 0) / collectedInvoices.length)
      : 0;

    return { totalExpected, totalBilled, totalCollected, totalPending, totalDifferences, avgCollectionDays };
  }, [allInvoices]);

  const chartData = useMemo(() => {
    const monthly: Record<string, { name: string; cobrado: number; facturado: number }> = {};
    allInvoices.slice(0, 12).forEach((invoice) => {
      const month = format(parseDate(invoice.fechaEmision), 'MMM yy');
      if (!monthly[month]) monthly[month] = { name: month, cobrado: 0, facturado: 0 };
      monthly[month].cobrado += invoice.montoCobrado;
      monthly[month].facturado += invoice.montoFacturado;
    });
    return Object.values(monthly).reverse();
  }, [allInvoices]);

  const configs = useMemo(() => {
    return insurers.flatMap((insurer, insurerIndex) =>
      RUBROS.slice(0, (insurerIndex % 3) + 1).map((rubro, rubroIndex) => ({
        id: `${insurer.id}-${rubro}`,
        aseguradoraId: insurer.id,
        rubro,
        porcentaje: 12 + insurerIndex + (rubroIndex * 2),
      }))
    );
  }, [insurers]);

  const handleExport = async () => {
    try {
      const blob = await api.commissions.invoices.export();
      downloadBlob(blob, 'Gestion_Comisiones_PAS.xlsx');
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo exportar el reporte.', severity: 'error' });
    }
  };

  const handleGenerateInvoices = () => {
    const period = format(new Date(), 'MMMM yyyy');
    window.alert(`Generando facturas automáticas para el periodo ${period}...\n\nSe agruparán las comisiones pendientes por compañía.`);
  };

  const openPayment = (invoice: ExtendedInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      monto: String(Math.max(0, invoice.montoFacturado - invoice.montoCobrado)),
      fechaPago: today(),
      medioPago: 'Transferencia',
    });
    setOpenPaymentDialog(true);
  };

  const savePayment = async () => {
    if (!selectedInvoice) return;
    setSavingPayment(true);
    try {
      await api.commissions.invoices.addPayment(selectedInvoice.id, {
        fechaPago: paymentForm.fechaPago,
        monto: Number(paymentForm.monto),
        medioPago: paymentForm.medioPago,
        comprobanteUrl: '',
      });
      setOpenPaymentDialog(false);
      setSnack({ open: true, message: 'Cobro registrado.', severity: 'success' });
      await loadData();
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo registrar el cobro.', severity: 'error' });
    } finally {
      setSavingPayment(false);
    }
  };

  const getStatusChip = (status: InvoiceStatus) => (
    <Chip
      label={status}
      size="small"
      sx={{
        bgcolor: `${STATUS_COLORS[status]}20`,
        color: STATUS_COLORS[status],
        fontWeight: 700,
        borderRadius: '6px',
      }}
    />
  );

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  }

  const efficacy = stats.totalBilled > 0 ? Math.round((stats.totalCollected / stats.totalBilled) * 100) : 0;

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: 0 }}>Gestión Financiera de Comisiones</Typography>
          <Typography variant="body1" color="text.secondary">Control de facturación, auditoría de liquidaciones y seguimiento de cobranzas.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="outlined" startIcon={<History size={20} />} onClick={handleGenerateInvoices} sx={{ borderRadius: '12px', fontWeight: 600 }}>
            Generar Facturas Mensuales
          </Button>
          <Button variant="outlined" startIcon={<Download size={20} />} onClick={handleExport} sx={{ borderRadius: '12px', fontWeight: 600 }}>
            Exportar Reporte
          </Button>
          <Button variant="contained" startIcon={<Plus size={20} />} onClick={() => navigate('/facturacion')} sx={{ borderRadius: '12px', fontWeight: 700, px: 3 }}>
            Nueva Factura
          </Button>
        </Box>
      </Box>

      {stats.totalDifferences > 0 && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '16px', border: '1px solid #fee2e2' }}>
          <AlertTitle sx={{ fontWeight: 800 }}>Diferencias de Liquidación Detectadas</AlertTitle>
          Se han detectado <strong>{stats.totalDifferences} facturas</strong> con discrepancias entre el monto esperado y el liquidado por la compañía.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Comisiones Generadas', value: stats.totalExpected, icon: <TrendingUp size={24} />, color: '#6366f1', desc: 'Monto esperado según pólizas' },
          { label: 'Total Facturado', value: stats.totalBilled, icon: <FileText size={24} />, color: '#3b82f6', desc: 'Facturas emitidas a compañías' },
          { label: 'Total Cobrado', value: stats.totalCollected, icon: <CheckCircle2 size={24} />, color: '#10b981', desc: 'Ingresos reales percibidos' },
          { label: 'Pendiente de Cobro', value: stats.totalPending, icon: <Clock size={24} />, color: '#f59e0b', desc: 'Facturado vs Cobrado' },
        ].map((stat, index) => (
          <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ p: 1.5, bgcolor: `${stat.color}15`, color: stat.color, borderRadius: '12px' }}>{stat.icon}</Box>
                  {index === 2 && (
                    <Chip label={`${efficacy}% Eficacia`} size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '0.7rem' }} />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, my: 0.5 }}>{money(stat.value)}</Typography>
                <Typography variant="caption" color="text.secondary">{stat.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '1rem' } }}>
          <Tab icon={<PieIcon size={18} />} iconPosition="start" label="Dashboard Financiero" />
          <Tab icon={<Receipt size={18} />} iconPosition="start" label="Facturación y Cobranzas" />
          <Tab icon={<ShieldCheck size={18} />} iconPosition="start" label="Auditoría de Diferencias" />
          <Tab icon={<Settings size={18} />} iconPosition="start" label="Configuración de Comisiones" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Evolución de Ingresos (Facturado vs Cobrado)</Typography>
                <Box sx={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [money(Number(value || 0)), '']}
                      />
                      <Bar dataKey="facturado" name="Facturado" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="cobrado" name="Cobrado" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Eficiencia de Cobro</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box sx={{ p: 3, bgcolor: '#f8fafc', borderRadius: '16px', textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Tiempo Promedio de Cobro</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main', my: 1 }}>
                      {stats.avgCollectionDays} <Typography component="span" variant="h6">días</Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Desde la emisión de la factura</Typography>
                  </Box>

                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Ranking por Compañía (Volumen)</Typography>
                  {insurers.slice(0, 4).map((insurer, index) => (
                    <Box key={insurer.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 32, height: 32, bgcolor: 'primary.light', color: 'primary.main', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                        {index + 1}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{insurer.razonSocial}</Typography>
                        <LinearProgress variant="determinate" value={80 - (index * 15)} sx={{ height: 6, borderRadius: 3, mt: 0.5 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Box>
          <Card sx={{ mb: 3, borderRadius: '16px' }}>
            <CardContent sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar por factura o compañía..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment> }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth select size="small" label="Estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <MenuItem value="all">Todos los estados</MenuItem>
                    <MenuItem value="Pendiente">Pendiente</MenuItem>
                    <MenuItem value="Facturada">Facturada</MenuItem>
                    <MenuItem value="Parcial">Parcial</MenuItem>
                    <MenuItem value="Cobrada">Cobrada</MenuItem>
                    <MenuItem value="Vencida">Vencida</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth select size="small" label="Compañía" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
                    <MenuItem value="all">Todas las compañías</MenuItem>
                    {insurers.map((insurer) => (
                      <MenuItem key={insurer.id} value={insurer.id}>{insurer.razonSocial}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <Button fullWidth variant="outlined" startIcon={<Filter size={18} />} sx={{ borderRadius: '8px' }}>Filtros</Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 980 }}>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Factura / Periodo</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Compañía</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Emisión / Vto.</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Monto Facturado</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Cobrado</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const isOverdue = invoice.estado !== 'Cobrada' && differenceInDays(new Date(), parseDate(invoice.vencimiento)) > 0;
                  return (
                    <TableRow key={invoice.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{invoice.numeroFactura || 'S/N'}</Typography>
                        <Typography variant="caption" color="text.secondary">{invoice.periodo}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{invoice.insurerName}</Typography></TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block">Emi: {format(parseDate(invoice.fechaEmision), 'dd/MM/yy')}</Typography>
                        <Typography variant="caption" sx={{ color: isOverdue ? 'error.main' : 'text.secondary', fontWeight: isOverdue ? 700 : 400 }}>
                          Vto: {format(parseDate(invoice.vencimiento), 'dd/MM/yy')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}><Typography variant="body2" sx={{ fontWeight: 700 }}>{money(invoice.montoFacturado)}</Typography></TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>{money(invoice.montoCobrado)}</Typography>
                        {invoice.montoFacturado > invoice.montoCobrado && invoice.montoCobrado > 0 && (
                          <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>
                            Pend: {money(invoice.montoFacturado - invoice.montoCobrado)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{getStatusChip(isOverdue ? 'Vencida' : invoice.estado)}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Tooltip title="Registrar Cobro">
                            <IconButton size="small" color="success" onClick={() => openPayment(invoice)}>
                              <CreditCard size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Ver Detalle">
                            <IconButton size="small" color="primary">
                              <Eye size={18} />
                            </IconButton>
                          </Tooltip>
                          <IconButton size="small"><MoreVertical size={18} /></IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 8, textAlign: 'center', color: 'text.secondary', fontWeight: 600 }}>No hay facturas de comisiones</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
            Esta sección muestra las facturas donde el monto liquidado por la compañía difiere del monto esperado según las pólizas vigentes.
          </Alert>

          <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Factura</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Compañía</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Esperado</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Liquidado</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Diferencia</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Observaciones</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allInvoices.filter((invoice) => invoice.diferenciaDetectada).map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell sx={{ fontWeight: 700 }}>{invoice.numeroFactura}</TableCell>
                    <TableCell>{invoice.insurerName}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{money(invoice.montoEsperado)}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{money(invoice.montoFacturado)}</TableCell>
                    <TableCell sx={{ textAlign: 'right', color: 'error.main', fontWeight: 800 }}>{money(invoice.montoEsperado - invoice.montoFacturado)}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        {invoice.notas || 'Sin observaciones registradas.'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Button size="small" variant="outlined" color="error" sx={{ borderRadius: '8px' }}>Reclamar</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {allInvoices.filter((invoice) => invoice.diferenciaDetectada).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 8, textAlign: 'center' }}>
                      <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: 16 }} />
                      <Typography variant="h6">No se detectaron diferencias de liquidación</Typography>
                      <Typography variant="body2" color="text.secondary">Todas las facturas coinciden con los montos esperados.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tabValue === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Configuración de Porcentajes por Compañía y Rubro</Typography>
            <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setOpenConfigDialog(true)}>Nueva Configuración</Button>
          </Box>

          <Grid container spacing={3}>
            {insurers.slice(0, 6).map((insurer) => (
              <Grid key={insurer.id} size={{ xs: 12, md: 4 }}>
                <Card sx={{ borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box sx={{ width: 40, height: 40, bgcolor: 'primary.main', color: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldCheck size={24} />
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{insurer.razonSocial}</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {configs.filter((config) => config.aseguradoraId === insurer.id).map((config) => (
                        <Box key={config.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#f8fafc', borderRadius: '12px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{config.rubro}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>{config.porcentaje}%</Typography>
                            <IconButton size="small"><Edit size={14} /></IconButton>
                          </Box>
                        </Box>
                      ))}
                      {configs.filter((config) => config.aseguradoraId === insurer.id).length === 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>No hay porcentajes configurados.</Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Registrar Cobro de Comisión</DialogTitle>
        <DialogContent dividers>
          {selectedInvoice && (
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: '12px' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Factura Seleccionada</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{selectedInvoice.numeroFactura}</Typography>
              <Typography variant="body2" color="text.secondary">{selectedInvoice.insurerName} - {selectedInvoice.periodo}</Typography>
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Total Facturado:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{money(selectedInvoice.montoFacturado)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Ya Cobrado:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>{money(selectedInvoice.montoCobrado)}</Typography>
              </Box>
            </Box>
          )}
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Monto a Cobrar"
                type="number"
                value={paymentForm.monto}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, monto: event.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Fecha de Cobro"
                type="date"
                value={paymentForm.fechaPago}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, fechaPago: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth select label="Medio de Pago" value={paymentForm.medioPago} onChange={(event) => setPaymentForm((prev) => ({ ...prev, medioPago: event.target.value }))}>
                <MenuItem value="Transferencia">Transferencia Bancaria</MenuItem>
                <MenuItem value="Efectivo">Efectivo</MenuItem>
                <MenuItem value="Cheque">Cheque</MenuItem>
              </TextField>
            </Grid>
            <Grid size={12}>
              <Button fullWidth variant="outlined" startIcon={<FileUp size={18} />} sx={{ borderStyle: 'dashed', py: 1.5 }}>Adjuntar Comprobante</Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenPaymentDialog(false)} color="inherit">Cancelar</Button>
          <Button variant="contained" onClick={savePayment} disabled={savingPayment || !paymentForm.monto} sx={{ px: 4 }}>
            {savingPayment ? 'Guardando...' : 'Confirmar Cobro'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openConfigDialog} onClose={() => setOpenConfigDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Configurar Porcentaje de Comisión</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField fullWidth select label="Aseguradora" defaultValue={insurers[0]?.id || ''}>
                {insurers.map((insurer) => <MenuItem key={insurer.id} value={insurer.id}>{insurer.razonSocial}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField fullWidth select label="Rubro" defaultValue={RUBROS[0]}>
                {RUBROS.map((rubro) => <MenuItem key={rubro} value={rubro}>{rubro}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Porcentaje de Comisión" type="number" InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenConfigDialog(false)} color="inherit">Cancelar</Button>
          <Button variant="contained" onClick={() => setOpenConfigDialog(false)}>Guardar Configuración</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((prev) => ({ ...prev, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
};
