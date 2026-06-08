import React, { useEffect, useState } from 'react';
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  AlertTriangle,
  CreditCard,
  Download,
  DollarSign,
  Edit,
  Lock,
  PieChart as PieIcon,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { api } from '../api';

const COLORS = ['#1a237e', '#00c853', '#ff9100', '#f44336', '#9c27b0', '#00bcd4'];
const INVOICE_STATUSES = ['PENDIENTE', 'FACTURADA', 'COBRADA', 'PARCIAL', 'VENCIDA'];

const today = () => new Date().toISOString().split('T')[0];
const currentPeriod = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const emptyInvoiceForm = {
  insuranceCompanyId: '',
  periodo: currentPeriod(),
  numeroFactura: '',
  fechaEmision: today(),
  fechaVencimiento: '',
  estado: 'PENDIENTE',
  monto: '',
  moneda: 'ARS',
  comprobanteUrl: '',
  notes: '',
  policyIds: [] as string[],
};

const emptyPaymentForm = {
  fechaPago: today(),
  monto: '',
  medioPago: '',
  comprobanteUrl: '',
};

const formatMoney = (value: number, currency = 'ARS') =>
  `${currency} ${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

const statusColor = (status: string) => {
  if (status === 'COBRADA') return 'success';
  if (status === 'PARCIAL' || status === 'FACTURADA') return 'warning';
  if (status === 'VENCIDA') return 'error';
  return 'default';
};

export const CommissionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, m, invoiceData, insurerData, policyData] = await Promise.all([
        api.commissions.summary(),
        api.commissions.monthly(),
        api.commissions.invoices.list({ search: invoiceSearch || undefined }),
        api.directory.insurers.list(),
        api.dashboard.policies(undefined, 500),
      ]);
      setSummary(s);
      setMonthly(m);
      setInvoices(invoiceData);
      setInsurers(insurerData);
      setPolicies(policyData);
    } catch (err: any) {
      setSnack({ open: true, msg: err.message || 'No se pudieron cargar las comisiones.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [invoiceSearch]);

  const handleExport = async () => {
    try {
      const blob = activeTab === 0 ? await api.commissions.export() : await api.commissions.invoices.export();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeTab === 0 ? 'Comisiones_PAS_Alert.xlsx' : 'Facturas_Comisiones_PAS_Alert.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setSnack({ open: true, msg: err.message, severity: 'error' });
    }
  };

  const handleCierreMensual = async () => {
    const now = new Date();
    setClosing(true);
    try {
      await api.commissions.close(now.getMonth() + 1, now.getFullYear());
      setSnack({ open: true, msg: 'Cierre mensual realizado exitosamente.', severity: 'success' });
      fetchData();
    } catch (err: any) {
      setSnack({ open: true, msg: err.message, severity: 'error' });
    } finally {
      setClosing(false);
    }
  };

  const openInvoiceDialog = (invoice?: any) => {
    setEditingInvoice(invoice || null);
    setInvoiceForm(invoice
      ? {
          insuranceCompanyId: invoice.insuranceCompanyId || '',
          periodo: invoice.periodo || currentPeriod(),
          numeroFactura: invoice.numeroFactura || '',
          fechaEmision: invoice.fechaEmision || today(),
          fechaVencimiento: invoice.fechaVencimiento || '',
          estado: invoice.estado || 'PENDIENTE',
          monto: String(invoice.monto || ''),
          moneda: invoice.moneda || 'ARS',
          comprobanteUrl: invoice.comprobanteUrl || '',
          notes: invoice.notes || '',
          policyIds: (invoice.policies || []).map((policy: any) => policy.id),
        }
      : { ...emptyInvoiceForm, periodo: currentPeriod(), fechaEmision: today() });
    setInvoiceDialogOpen(true);
  };

  const saveInvoice = async () => {
    setSaving(true);
    try {
      const payload = {
        ...invoiceForm,
        insuranceCompanyId: invoiceForm.insuranceCompanyId || null,
        monto: Number(invoiceForm.monto),
      };

      if (editingInvoice) {
        await api.commissions.invoices.update(editingInvoice.id, payload);
      } else {
        await api.commissions.invoices.create(payload);
      }

      setInvoiceDialogOpen(false);
      setSnack({ open: true, msg: 'Factura guardada.', severity: 'success' });
      await fetchData();
    } catch (err: any) {
      setSnack({ open: true, msg: err.message || 'No se pudo guardar la factura.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const deleteInvoice = async (invoice: any) => {
    if (!window.confirm(`Eliminar factura ${invoice.numeroFactura}?`)) return;
    try {
      await api.commissions.invoices.delete(invoice.id);
      setSnack({ open: true, msg: 'Factura eliminada.', severity: 'success' });
      await fetchData();
    } catch (err: any) {
      setSnack({ open: true, msg: err.message || 'No se pudo eliminar la factura.', severity: 'error' });
    }
  };

  const openPaymentDialog = (invoice: any) => {
    setPaymentInvoice(invoice);
    setPaymentForm({ ...emptyPaymentForm, fechaPago: today() });
    setPaymentDialogOpen(true);
  };

  const savePayment = async () => {
    if (!paymentInvoice) return;
    setSaving(true);
    try {
      await api.commissions.invoices.addPayment(paymentInvoice.id, {
        ...paymentForm,
        monto: Number(paymentForm.monto),
      });
      setPaymentDialogOpen(false);
      setSnack({ open: true, msg: 'Pago registrado.', severity: 'success' });
      await fetchData();
    } catch (err: any) {
      setSnack({ open: true, msg: err.message || 'No se pudo registrar el pago.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const deletePayment = async (invoice: any, payment: any) => {
    if (!window.confirm('Eliminar pago registrado?')) return;
    try {
      await api.commissions.invoices.deletePayment(invoice.id, payment.id);
      setSnack({ open: true, msg: 'Pago eliminado.', severity: 'success' });
      await fetchData();
    } catch (err: any) {
      setSnack({ open: true, msg: err.message || 'No se pudo eliminar el pago.', severity: 'error' });
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  const barData = monthly.map((m: any) => ({ name: m.name || m.mes, comision: m.comision }));
  const pieData = summary?.distribucion || [];
  const objetivo = summary?.totalPrima > 0 ? Math.min(100, Math.round((summary.comisionProyectada / summary.totalPrima) * 100)) : 0;

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <Box sx={{
        mb: 4,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'flex-start' },
        gap: 2,
        minWidth: 0,
      }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>Comisiones</Typography>
          <Typography variant="body1" color="text.secondary">Analisis mensual y facturacion detallada por aseguradora.</Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: activeTab === 0 ? 'repeat(2, max-content)' : 'repeat(2, max-content)' }, gap: 1.5, justifyContent: { xs: 'stretch', md: 'flex-end' }, minWidth: 0 }}>
          {activeTab === 0 ? (
            <Button variant="contained" color="secondary" onClick={handleCierreMensual} disabled={closing} startIcon={<Lock size={20} />}>
              {closing ? 'Cerrando...' : 'Cierre Mensual'}
            </Button>
          ) : (
            <Button variant="contained" onClick={() => openInvoiceDialog()} startIcon={<Plus size={20} />}>Nueva Factura</Button>
          )}
          <Button variant="outlined" startIcon={<Download size={20} />} onClick={handleExport}>Exportar Excel</Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          <Tab label="Analisis" />
          <Tab label="Facturacion" />
        </Tabs>
      </Box>

      {activeTab === 0 ? (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1 }}>Comision Proyectada</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800 }}>$ {(summary?.comisionProyectada || 0).toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 }}><DollarSign size={24} /></Box>
                  </Box>
                  <Typography variant="caption" sx={{ mt: 2, display: 'block', opacity: 0.8 }}>Basado en polizas activas</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>Objetivo Mensual</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800 }}>{objetivo}%</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: 'success.light', color: 'success.main', borderRadius: 3 }}><Target size={24} /></Box>
                  </Box>
                  <LinearProgress variant="determinate" value={objetivo} sx={{ mt: 2, height: 8, borderRadius: 4 }} />
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>Promedio por Poliza</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800 }}>$ {(summary?.promedioPoliza || 0).toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: 'secondary.light', color: 'secondary.main', borderRadius: 3 }}><PieIcon size={24} /></Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Evolucion Mensual</Typography>
                  <Box sx={{ height: 300, mt: 2 }}>
                    {barData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <ChartTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="comision" fill="#1a237e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                        <Typography>Realiza un cierre mensual para ver la evolucion.</Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Distribucion por Rubro</Typography>
                  <Box sx={{ height: 300, mt: 2 }}>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {pieData.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                        <Typography variant="body2">Sin datos de distribucion.</Typography>
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    {pieData.map((item: any, index: number) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: COLORS[index % COLORS.length] }} />
                          <Typography variant="body2">{item.name}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.value}%</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Detalle de Comisiones</Typography>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'slate.50' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Mes</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Total Prima</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Comision Bruta</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Crecimiento</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {monthly.length > 0 ? monthly.map((row: any, index: number) => (
                      <TableRow key={index} hover>
                        <TableCell>{row.name || row.mes}</TableCell>
                        <TableCell>$ {(row.totalPrima || 0).toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>$ {(row.comision || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          {row.crecimiento !== null ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: row.crecimiento >= 0 ? 'success.main' : 'error.main' }}>
                              {row.crecimiento >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                              {row.crecimiento >= 0 ? '+' : ''}{row.crecimiento.toFixed(1)}%
                            </Box>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontWeight: 600 }}>No hay datos</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <TextField
                fullWidth
                placeholder="Buscar por aseguradora, periodo o numero de factura..."
                value={invoiceSearch}
                onChange={(event) => setInvoiceSearch(event.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search size={20} /></InputAdornment> }}
              />
            </CardContent>
          </Card>

          <TableContainer component={Paper} sx={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 1120 }}>
              <TableHead sx={{ bgcolor: 'secondary.main' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Aseguradora</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Periodo</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Factura</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Estado</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Monto</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Cobrado / Saldo</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Polizas</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'right' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{invoice.insuranceCompany?.razonSocial || '-'}</TableCell>
                    <TableCell>{invoice.periodo}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{invoice.numeroFactura}</Typography>
                      <Typography variant="caption" color="text.secondary">{invoice.fechaEmision} / {invoice.fechaVencimiento || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={invoice.estadoCalculado} color={statusColor(invoice.estadoCalculado) as any} sx={{ fontWeight: 700 }} />
                      {invoice.diferenciaDetectada && (
                        <Tooltip title="Diferencia contra comisiones esperadas"><AlertTriangle size={16} color="#dc2626" style={{ marginLeft: 8, verticalAlign: 'middle' }} /></Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(invoice.monto, invoice.moneda)}</Typography>
                      <Typography variant="caption" color="text.secondary">Esperado {formatMoney(invoice.montoEsperado, invoice.moneda)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(invoice.montoCobrado, invoice.moneda)}</Typography>
                      <Typography variant="caption" color="text.secondary">Saldo {formatMoney(invoice.saldoPendiente, invoice.moneda)}</Typography>
                      {(invoice.payments || []).map((payment: any) => (
                        <Box key={payment.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption">{payment.fechaPago}: {formatMoney(payment.monto, invoice.moneda)}</Typography>
                          <IconButton size="small" color="error" onClick={() => deletePayment(invoice, payment)}><Trash2 size={13} /></IconButton>
                        </Box>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(invoice.policies || []).length > 0 ? invoice.policies.map((policy: any) => (
                          <Chip key={policy.id} size="small" variant="outlined" label={`${policy.numeroPoliza} ${policy.cuotaActual}/${policy.cuotaTotal}`} />
                        )) : <Typography variant="body2" color="text.secondary">-</Typography>}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Tooltip title="Registrar pago"><IconButton color="success" onClick={() => openPaymentDialog(invoice)}><CreditCard size={18} /></IconButton></Tooltip>
                      <Tooltip title="Editar"><IconButton onClick={() => openInvoiceDialog(invoice)}><Edit size={18} /></IconButton></Tooltip>
                      <Tooltip title="Eliminar"><IconButton color="error" onClick={() => deleteInvoice(invoice)}><Trash2 size={18} /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontWeight: 600 }}>No hay facturas de comisiones</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingInvoice ? 'Editar Factura' : 'Nueva Factura'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth label="Aseguradora" value={invoiceForm.insuranceCompanyId} onChange={(e) => setInvoiceForm((s) => ({ ...s, insuranceCompanyId: e.target.value }))}>
                <MenuItem value="">Sin aseguradora</MenuItem>
                {insurers.map((insurer) => <MenuItem key={insurer.id} value={insurer.id}>{insurer.razonSocial}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Periodo" placeholder="YYYY-MM" value={invoiceForm.periodo} onChange={(e) => setInvoiceForm((s) => ({ ...s, periodo: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Numero factura" value={invoiceForm.numeroFactura} onChange={(e) => setInvoiceForm((s) => ({ ...s, numeroFactura: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth type="date" label="Fecha emision" InputLabelProps={{ shrink: true }} value={invoiceForm.fechaEmision} onChange={(e) => setInvoiceForm((s) => ({ ...s, fechaEmision: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth type="date" label="Vencimiento" InputLabelProps={{ shrink: true }} value={invoiceForm.fechaVencimiento} onChange={(e) => setInvoiceForm((s) => ({ ...s, fechaVencimiento: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Estado" value={invoiceForm.estado} onChange={(e) => setInvoiceForm((s) => ({ ...s, estado: e.target.value }))}>
                {INVOICE_STATUSES.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Monto" type="number" value={invoiceForm.monto} onChange={(e) => setInvoiceForm((s) => ({ ...s, monto: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Moneda" value={invoiceForm.moneda} onChange={(e) => setInvoiceForm((s) => ({ ...s, moneda: e.target.value }))}>
                <MenuItem value="ARS">ARS</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="URL comprobante" value={invoiceForm.comprobanteUrl} onChange={(e) => setInvoiceForm((s) => ({ ...s, comprobanteUrl: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                multiple
                options={policies}
                getOptionLabel={(option) => `${option.poliza || option.numeroPoliza} - ${option.cliente || option.clienteNombre} (${option.cuotaActual}/${option.cuotaTotal})`}
                value={policies.filter((policy) => invoiceForm.policyIds.includes(policy.id))}
                onChange={(_, value) => setInvoiceForm((s) => ({ ...s, policyIds: value.map((policy) => policy.id) }))}
                renderInput={(params) => <TextField {...params} label="Polizas vinculadas" />}
              />
            </Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth multiline minRows={3} label="Notas" value={invoiceForm.notes} onChange={(e) => setInvoiceForm((s) => ({ ...s, notes: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setInvoiceDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={saveInvoice} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Registrar Pago</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="date" label="Fecha de pago" InputLabelProps={{ shrink: true }} value={paymentForm.fechaPago} onChange={(e) => setPaymentForm((s) => ({ ...s, fechaPago: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="number" label="Monto" value={paymentForm.monto} onChange={(e) => setPaymentForm((s) => ({ ...s, monto: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Medio de pago" value={paymentForm.medioPago} onChange={(e) => setPaymentForm((s) => ({ ...s, medioPago: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="URL comprobante" value={paymentForm.comprobanteUrl} onChange={(e) => setPaymentForm((s) => ({ ...s, comprobanteUrl: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={savePayment} disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};
