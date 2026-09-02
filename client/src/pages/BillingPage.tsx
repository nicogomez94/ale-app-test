import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress,
  Collapse, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, IconButton,
  InputAdornment, Link, MenuItem, Paper, Snackbar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { CheckCircle2, ChevronDown, ChevronUp, CreditCard, Download, Edit, ExternalLink, Eye, FileDown, Layers, Plus, ReceiptText, Search, Trash2, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { printTableReport } from '../utils/reportExports';

type Currency = 'ARS' | 'USD';
type InvoiceStatus = 'PENDIENTE' | 'FACTURADA' | 'COBRADA' | 'PARCIAL' | 'VENCIDA';

type Insurer = { id: string; razonSocial: string };
type PolicyOption = {
  id: string;
  clienteNombre: string;
  aseguradora: string;
  numeroPoliza: string;
  moneda: string;
  comisionCalculada: number;
  cuotaActual: number;
  cuotaTotal: number;
};
type InvoicePayment = { id: string; fechaPago: string; monto: number; medioPago?: string; comprobanteUrl?: string };
type LinkedPolicy = PolicyOption & { rubro?: string };
type Invoice = {
  id: string;
  insuranceCompanyId: string;
  insuranceCompany?: Insurer;
  periodo: string;
  numeroFactura: string;
  numeroLiquidacion?: string;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: InvoiceStatus;
  estadoCalculado: InvoiceStatus;
  monto: number;
  moneda: Currency;
  comprobanteUrl?: string;
  notes?: string;
  montoCobrado: number;
  saldoPendiente: number;
  montoEsperado: number;
  diferenciaDetectada: boolean;
  payments: InvoicePayment[];
  policies: LinkedPolicy[];
};

const today = () => new Date().toISOString().split('T')[0];
const currentPeriod = () => today().slice(0, 7);
const emptyInvoice = {
  insuranceCompanyId: '', periodo: currentPeriod(), numeroFactura: '', numeroLiquidacion: '', fechaEmision: today(),
  fechaVencimiento: '', estado: 'PENDIENTE' as InvoiceStatus, monto: '', montoCobradoInicial: '', moneda: 'ARS' as Currency,
  comprobanteUrl: '', notes: '', policyIds: [] as string[],
};
const emptyPayment = { fechaPago: today(), monto: '', medioPago: 'Transferencia', comprobanteUrl: '' };

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDIENTE: 'Pendiente', FACTURADA: 'Facturada', COBRADA: 'Cobrada', PARCIAL: 'Parcial', VENCIDA: 'Vencida',
};
const STATUS_COLORS: Record<InvoiceStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  PENDIENTE: 'default', FACTURADA: 'info', COBRADA: 'success', PARCIAL: 'warning', VENCIDA: 'error',
};
const money = (value: number, currency: Currency) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));

const moneyPair = (values: { ars: number; usd: number }) => {
  const parts = [money(values.ars, 'ARS')];
  if (values.usd > 0) parts.push(money(values.usd, 'USD'));
  return parts.join(' / ');
};

const sanitizeDecimal = (value: string) => {
  const cleaned = value.replace(/[^\d.,]/g, '');
  const separator = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'));
  if (separator < 0) return cleaned;
  const integer = cleaned.slice(0, separator).replace(/[.,]/g, '');
  const decimals = cleaned.slice(separator + 1).replace(/[.,]/g, '').slice(0, 2);
  return `${integer},${decimals}`;
};
const parseDecimal = (value: string) => {
  const cleaned = String(value || '').replace(/[^\d.,]/g, '');
  const separator = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'));
  if (separator < 0) return Number(cleaned) || 0;
  const integer = cleaned.slice(0, separator).replace(/[.,]/g, '');
  const decimals = cleaned.slice(separator + 1).replace(/[.,]/g, '');
  return Number(`${integer}.${decimals}`) || 0;
};
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const periodLabel = (period: string) => {
  const [year, month] = period.split('-');
  return month ? `${MONTH_LABELS[Number(month) - 1]} ${year.slice(-2)}` : period;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const BillingPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [policies, setPolicies] = useState<PolicyOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState(emptyInvoice);
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [payment, setPayment] = useState(emptyPayment);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'individual' | 'consolidated'>('individual');
  const [chartRange, setChartRange] = useState<6 | 12>(12);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [chartYear, setChartYear] = useState('ALL');
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({});
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [invoiceData, insurerData, policyData] = await Promise.all([
        api.commissions.invoices.list(), api.directory.insurers.list(), api.policies.list(),
      ]);
      setInvoices(invoiceData as Invoice[]);
      setInsurers(insurerData as Insurer[]);
      setPolicies(policyData as unknown as PolicyOption[]);
      if (detail) setDetail((invoiceData as Invoice[]).find((item) => item.id === detail.id) || null);
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo cargar la facturación.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return invoices;
    return invoices.filter((invoice) => [invoice.insuranceCompany?.razonSocial, invoice.periodo, invoice.numeroFactura]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [invoices, search]);

  const eligiblePolicies = useMemo(() => {
    const insurer = insurers.find((item) => item.id === form.insuranceCompanyId);
    if (!insurer) return [];
    const name = insurer.razonSocial.trim().toLowerCase();
    return policies.filter((policy) => policy.moneda === form.moneda && policy.aseguradora.trim().toLowerCase() === name);
  }, [form.insuranceCompanyId, form.moneda, insurers, policies]);

  const totals = useMemo(() => invoices.reduce((acc, invoice) => {
    const bucket = invoice.moneda === 'USD' ? 'usd' : 'ars';
    acc[bucket].facturado += Number(invoice.monto || 0);
    acc[bucket].cobrado += Number(invoice.montoCobrado || 0);
    return acc;
  }, { ars: { facturado: 0, cobrado: 0 }, usd: { facturado: 0, cobrado: 0 } }), [invoices]);

  const chartYears = useMemo(() => Array.from(new Set(invoices.map((invoice) => invoice.periodo.slice(0, 4)))).sort().reverse(), [invoices]);
  const chartData = useMemo(() => {
    const periods = new Map<string, { periodo: string; FacturadoARS: number; CobradoARS: number; RetencionesARS: number; FacturadoUSD: number; CobradoUSD: number; RetencionesUSD: number }>();
    invoices.filter((invoice) => chartYear === 'ALL' || invoice.periodo.startsWith(`${chartYear}-`)).forEach((invoice) => {
      const current = periods.get(invoice.periodo) || { periodo: invoice.periodo, FacturadoARS: 0, CobradoARS: 0, RetencionesARS: 0, FacturadoUSD: 0, CobradoUSD: 0, RetencionesUSD: 0 };
      if (invoice.moneda === 'USD') {
        current.FacturadoUSD += Number(invoice.monto || 0);
        current.CobradoUSD += Number(invoice.montoCobrado || 0);
        current.RetencionesUSD += Math.max(0, Number(invoice.monto || 0) - Number(invoice.montoCobrado || 0));
      } else {
        current.FacturadoARS += Number(invoice.monto || 0);
        current.CobradoARS += Number(invoice.montoCobrado || 0);
        current.RetencionesARS += Math.max(0, Number(invoice.monto || 0) - Number(invoice.montoCobrado || 0));
      }
      periods.set(invoice.periodo, current);
    });
    return Array.from(periods.values()).sort((a, b) => a.periodo.localeCompare(b.periodo)).slice(-chartRange);
  }, [invoices, chartRange, chartYear]);
  const projectionData = useMemo(() => chartData.slice(-6).map((row) => ({
    periodo: row.periodo,
    ProyectadoARS: row.FacturadoARS,
    PercibidoARS: row.CobradoARS,
    ProyectadoUSD: row.FacturadoUSD,
    PercibidoUSD: row.CobradoUSD,
  })), [chartData]);

  const groupedByPeriod = useMemo(() => {
    const groups = new Map<string, { periodo: string; invoices: Invoice[]; facturado: { ars: number; usd: number }; cobrado: { ars: number; usd: number }; companies: Set<string> }>();
    filteredInvoices.forEach((invoice) => {
      const group = groups.get(invoice.periodo) || { periodo: invoice.periodo, invoices: [], facturado: { ars: 0, usd: 0 }, cobrado: { ars: 0, usd: 0 }, companies: new Set<string>() };
      const bucket = invoice.moneda === 'USD' ? 'usd' : 'ars';
      group.invoices.push(invoice);
      group.facturado[bucket] += Number(invoice.monto || 0);
      group.cobrado[bucket] += Number(invoice.montoCobrado || 0);
      if (invoice.insuranceCompany?.razonSocial) group.companies.add(invoice.insuranceCompany.razonSocial);
      groups.set(invoice.periodo, group);
    });
    return Array.from(groups.values()).sort((a, b) => b.periodo.localeCompare(a.periodo));
  }, [filteredInvoices]);

  const openForm = (invoice?: Invoice) => {
    setEditing(invoice || null);
    setForm(invoice ? {
      insuranceCompanyId: invoice.insuranceCompanyId || '', periodo: invoice.periodo, numeroFactura: invoice.numeroFactura, numeroLiquidacion: invoice.numeroLiquidacion || '',
      fechaEmision: invoice.fechaEmision, fechaVencimiento: invoice.fechaVencimiento || '', estado: invoice.estado,
      monto: String(invoice.monto), montoCobradoInicial: String(invoice.montoCobrado || 0), moneda: invoice.moneda, comprobanteUrl: invoice.comprobanteUrl || '',
      notes: invoice.notes || '', policyIds: invoice.policies.map((policy) => policy.id),
    } : { ...emptyInvoice, periodo: currentPeriod(), fechaEmision: today(), policyIds: [] });
    setFormOpen(true);
  };

  const saveInvoice = async () => {
    setSaving(true);
    try {
      const payload = { ...form, monto: parseDecimal(form.monto) };
      if (editing) await api.commissions.invoices.update(editing.id, payload);
      else {
        const created: any = await api.commissions.invoices.create(payload);
        const initialCollected = parseDecimal(form.montoCobradoInicial);
        if (initialCollected > 0 && created?.id) await api.commissions.invoices.addPayment(created.id, { fechaPago: today(), monto: initialCollected, medioPago: 'Transferencia' });
      }
      setFormOpen(false);
      setSnack({ open: true, message: 'Factura guardada.', severity: 'success' });
      await loadData();
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo guardar la factura.', severity: 'error' });
    } finally { setSaving(false); }
  };

  const deleteInvoice = async (invoice: Invoice) => {
    if (!window.confirm(`¿Eliminar la factura ${invoice.numeroFactura}?`)) return;
    try { await api.commissions.invoices.delete(invoice.id); await loadData(); }
    catch (error: any) { setSnack({ open: true, message: error.message || 'No se pudo eliminar.', severity: 'error' }); }
  };

  const addPayment = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const updated = await api.commissions.invoices.addPayment(detail.id, { ...payment, monto: parseDecimal(payment.monto) }) as Invoice;
      setDetail(updated);
      setPayment({ ...emptyPayment, fechaPago: today() });
      setSnack({ open: true, message: 'Pago registrado.', severity: 'success' });
      await loadData();
    } catch (error: any) {
      setSnack({ open: true, message: error.message || 'No se pudo registrar el pago.', severity: 'error' });
    } finally { setSaving(false); }
  };

  const removePayment = async (paymentId: string) => {
    if (!detail || !window.confirm('¿Eliminar este pago?')) return;
    try {
      const updated = await api.commissions.invoices.deletePayment(detail.id, paymentId) as Invoice;
      setDetail(updated);
      await loadData();
    } catch (error: any) { setSnack({ open: true, message: error.message || 'No se pudo eliminar el pago.', severity: 'error' }); }
  };

  const exportInvoices = async () => {
    try { downloadBlob(await api.commissions.invoices.export(), 'Facturas_Comisiones_PAS_Alert.xlsx'); }
    catch (error: any) { setSnack({ open: true, message: error.message || 'No se pudo exportar.', severity: 'error' }); }
  };
  const exportPdf = () => printTableReport('Control de Comisiones', invoices, [
    { label: 'Aseguradora', value: (i) => i.insuranceCompany?.razonSocial }, { label: 'Período', value: (i) => i.periodo }, { label: 'Factura', value: (i) => i.numeroFactura },
    { label: 'Liquidación', value: (i) => i.numeroLiquidacion }, { label: 'Facturado', value: (i) => money(i.monto, i.moneda) }, { label: 'Cobrado', value: (i) => money(i.montoCobrado, i.moneda) }, { label: 'Retenciones', value: (i) => money(Math.max(0, i.monto - i.montoCobrado), i.moneda) },
  ]);

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box><Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>Control de Comisiones</Typography><Typography color="text.secondary">Visualizá y conciliá las liquidaciones de comisión que te envían las aseguradoras y brokers.</Typography></Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}><Button variant="outlined" color="success" startIcon={<Download size={18} />} onClick={exportInvoices}>Exportar Excel</Button><Button variant="outlined" color="error" startIcon={<FileDown size={18} />} onClick={exportPdf}>Exportar PDF</Button><Button variant="contained" startIcon={<Plus size={18} />} onClick={() => openForm()}>Cargar Liquidación / Comisión</Button></Box>
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}><strong>Conciliación de Comisiones e Impuestos:</strong> la diferencia entre el monto facturado y el monto cobrado corresponde a retenciones de Ingresos Brutos (IIBB) e impuestos. El sistema calcula automáticamente esos importes.</Alert>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card><CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Layers size={18} color="#1a237e" />
              <Typography variant="caption" color="text.secondary" fontWeight={800}>Total facturado</Typography>
            </Box>
            <Typography variant="h4" fontWeight={900}>{moneyPair({ ars: totals.ars.facturado, usd: totals.usd.facturado })}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: '#fffdf4', border: '1px solid #f4e499' }}><CardContent><Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}><ReceiptText size={18} color="#d98a00" /><Typography variant="caption" color="#a36700" fontWeight={800}>Impuestos IIBB / Retenciones</Typography></Box><Typography variant="h4" fontWeight={900} color="#d98a00">{moneyPair({ ars: Math.max(0, totals.ars.facturado - totals.ars.cobrado), usd: Math.max(0, totals.usd.facturado - totals.usd.cobrado) })}</Typography></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card><CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CheckCircle2 size={18} color="#0f9f6e" />
              <Typography variant="caption" color="text.secondary" fontWeight={800}>Total cobrado</Typography>
            </Box>
            <Typography variant="h4" fontWeight={900} color="success.main">{moneyPair({ ars: totals.ars.cobrado, usd: totals.usd.cobrado })}</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp size={18} color="#1a237e" />
              <Typography variant="h6" fontWeight={900}>Evolución de Comisiones e Impuestos Recibidos</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <TextField select size="small" label="Año" value={chartYear} onChange={(event) => setChartYear(event.target.value)} sx={{ minWidth: 108 }}>
                <MenuItem value="ALL">Todos</MenuItem>
                {chartYears.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
              </TextField>
              <Button size="small" variant={chartRange === 6 ? 'contained' : 'outlined'} onClick={() => setChartRange(6)}>6 meses</Button>
              <Button size="small" variant={chartRange === 12 ? 'contained' : 'outlined'} onClick={() => setChartRange(12)}>12 meses</Button>
              <Button size="small" variant={chartType === 'line' ? 'contained' : 'outlined'} color="secondary" onClick={() => setChartType('line')}>Líneas</Button>
              <Button size="small" variant={chartType === 'bar' ? 'contained' : 'outlined'} color="secondary" onClick={() => setChartType('bar')}>Barras</Button>
            </Box>
          </Box>
          <Box sx={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              {chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="periodo" tickFormatter={periodLabel} tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip formatter={(value, name) => [money(Number(value || 0), String(name).includes('USD') ? 'USD' : 'ARS'), String(name)]} />
                  <Legend />
                  <Line type="monotone" dataKey="FacturadoARS" name="Facturado ARS" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="CobradoARS" name="Cobrado ARS" stroke="#0f9f6e" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="RetencionesARS" name="IIBB / Retenciones ARS" stroke="#e9ad25" strokeWidth={3} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="FacturadoUSD" name="Facturado USD" stroke="#6d28d9" strokeDasharray="5 4" dot={false} />
                  <Line type="monotone" dataKey="CobradoUSD" name="Cobrado USD" stroke="#06b6d4" strokeDasharray="5 4" dot={false} />
                  <Line type="monotone" dataKey="RetencionesUSD" name="IIBB / Retenciones USD" stroke="#d97706" strokeDasharray="5 4" dot={false} />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="periodo" tickFormatter={periodLabel} tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip formatter={(value, name) => [money(Number(value || 0), String(name).includes('USD') ? 'USD' : 'ARS'), String(name)]} />
                  <Legend />
                  <Bar dataKey="FacturadoARS" name="Facturado ARS" fill="#2563eb" radius={[5, 5, 0, 0]} barSize={14} />
                  <Bar dataKey="CobradoARS" name="Cobrado ARS" fill="#0f9f6e" radius={[5, 5, 0, 0]} barSize={14} />
                  <Bar dataKey="RetencionesARS" name="IIBB / Retenciones ARS" fill="#e9ad25" radius={[5, 5, 0, 0]} barSize={14} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={900}>Ingreso Mensual: Proyectado vs Percibido</Typography>
            <Typography variant="body2" color="text.secondary">Comparativa de las comisiones esperadas y las efectivamente cobradas durante los últimos 6 meses.</Typography>
          </Box>
          <Box sx={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={projectionData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="periodo" tickFormatter={periodLabel} tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip formatter={(value, name) => [money(Number(value || 0), String(name).includes('USD') ? 'USD' : 'ARS'), String(name)]} />
                <Legend />
                <Bar dataKey="ProyectadoARS" name="Proyectado ARS" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={14} />
                <Bar dataKey="PercibidoARS" name="Percibido ARS" fill="#12b886" radius={[6, 6, 0, 0]} barSize={14} />
                <Bar dataKey="ProyectadoUSD" name="Proyectado USD" fill="#c4b5fd" radius={[6, 6, 0, 0]} barSize={14} />
                <Bar dataKey="PercibidoUSD" name="Percibido USD" fill="#67e8c3" radius={[6, 6, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
      <Card sx={{ mb: 3 }}><CardContent><TextField fullWidth value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por aseguradora, período o número..." InputProps={{ startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment> }} /></CardContent></Card>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button variant={activeTab === 'individual' ? 'contained' : 'outlined'} onClick={() => setActiveTab('individual')}>Detalle de liquidaciones</Button>
        <Button variant={activeTab === 'consolidated' ? 'contained' : 'outlined'} onClick={() => setActiveTab('consolidated')}>Consolidación por período</Button>
      </Box>
      {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : (
        activeTab === 'individual' ? (
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}><Table sx={{ minWidth: 1120 }}>
            <TableHead><TableRow><TableCell>Aseguradora</TableCell><TableCell>Período / Factura</TableCell><TableCell>Emisión / Vto.</TableCell><TableCell>Estado</TableCell><TableCell align="right">Facturado</TableCell><TableCell align="right">Cobrado</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
            <TableBody>{filteredInvoices.map((invoice) => <TableRow key={invoice.id} hover>
              <TableCell sx={{ fontWeight: 700 }}>{invoice.insuranceCompany?.razonSocial || '-'}</TableCell>
              <TableCell><Typography variant="body2" fontWeight={700}>{invoice.numeroFactura}</Typography><Typography variant="caption">{invoice.periodo}</Typography></TableCell>
              <TableCell><Typography variant="caption" display="block">{invoice.fechaEmision}</Typography><Typography variant="caption">{invoice.fechaVencimiento || '-'}</Typography></TableCell>
              <TableCell><Chip size="small" color={STATUS_COLORS[invoice.estadoCalculado]} label={STATUS_LABELS[invoice.estadoCalculado]} /></TableCell>
              <TableCell align="right">{money(invoice.monto, invoice.moneda)}</TableCell><TableCell align="right">{money(invoice.montoCobrado, invoice.moneda)}</TableCell>
              <TableCell align="right"><Tooltip title="Ver detalle"><IconButton onClick={() => { setDetail(invoice); setPayment({ ...emptyPayment, monto: String(invoice.saldoPendiente) }); }}><Eye size={17} /></IconButton></Tooltip><Tooltip title="Editar"><IconButton onClick={() => openForm(invoice)}><Edit size={17} /></IconButton></Tooltip><Tooltip title="Eliminar"><IconButton color="error" onClick={() => deleteInvoice(invoice)}><Trash2 size={17} /></IconButton></Tooltip></TableCell>
            </TableRow>)}</TableBody>
          </Table></TableContainer>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 1120 }}>
              <TableHead><TableRow><TableCell>Período</TableCell><TableCell>Aseguradoras liquidadas</TableCell><TableCell align="right">Facturado total</TableCell><TableCell align="right">Cobrado total</TableCell><TableCell>Conciliaciones</TableCell><TableCell>Estado general</TableCell></TableRow></TableHead>
              <TableBody>{groupedByPeriod.map((group) => {
                const isExpanded = Boolean(expandedPeriods[group.periodo]);
                const allCollected = group.invoices.every((invoice) => invoice.estadoCalculado === 'COBRADA');
                const hasPartial = group.invoices.some((invoice) => invoice.estadoCalculado === 'PARCIAL');
                return (
                  <React.Fragment key={group.periodo}>
                    <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setExpandedPeriods((current) => ({ ...current, [group.periodo]: !current[group.periodo] }))}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton size="small">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</IconButton>
                          <Typography fontWeight={900}>{group.periodo}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{Array.from(group.companies).join(', ') || '-'}</TableCell>
                      <TableCell align="right">{moneyPair(group.facturado)}</TableCell>
                      <TableCell align="right">{moneyPair(group.cobrado)}</TableCell>
                      <TableCell>{group.invoices.length} factura{group.invoices.length === 1 ? '' : 's'}</TableCell>
                      <TableCell><Chip size="small" color={allCollected ? 'success' : hasPartial ? 'warning' : 'info'} label={allCollected ? 'Cobrado' : hasPartial ? 'Parcial' : 'Facturado'} /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                            <Table size="small">
                              <TableHead><TableRow><TableCell>Aseguradora / Broker</TableCell><TableCell>Factura</TableCell><TableCell align="right">Facturado</TableCell><TableCell align="right">Cobrado</TableCell><TableCell>Estado</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
                              <TableBody>{group.invoices.map((invoice) => (
                                <TableRow key={invoice.id} hover>
                                  <TableCell>{invoice.insuranceCompany?.razonSocial || '-'}</TableCell>
                                  <TableCell><Typography variant="body2" fontWeight={700}>{invoice.numeroFactura}</Typography><Typography variant="caption">{invoice.fechaEmision}</Typography></TableCell>
                                  <TableCell align="right">{money(invoice.monto, invoice.moneda)}</TableCell>
                                  <TableCell align="right">{money(invoice.montoCobrado, invoice.moneda)}</TableCell>
                                  <TableCell><Chip size="small" color={STATUS_COLORS[invoice.estadoCalculado]} label={STATUS_LABELS[invoice.estadoCalculado]} /></TableCell>
                                  <TableCell align="right"><IconButton onClick={() => { setDetail(invoice); setPayment({ ...emptyPayment, monto: String(invoice.saldoPendiente) }); }}><Eye size={17} /></IconButton><IconButton onClick={() => openForm(invoice)}><Edit size={17} /></IconButton></TableCell>
                                </TableRow>
                              ))}</TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}</TableBody>
            </Table>
          </TableContainer>
        )
      )}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>{editing ? 'Editar liquidación' : 'Cargar Nueva Comisión / Liquidación'}</DialogTitle><DialogContent dividers><Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}><TextField select fullWidth required label="Aseguradora" value={form.insuranceCompanyId} onChange={(e) => setForm((s) => ({ ...s, insuranceCompanyId: e.target.value, policyIds: [] }))}>{insurers.map((item) => <MenuItem key={item.id} value={item.id}>{item.razonSocial}</MenuItem>)}</TextField></Grid>
          <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth required type="month" label="Período" InputLabelProps={{ shrink: true }} value={form.periodo} onChange={(e) => setForm((s) => ({ ...s, periodo: e.target.value }))} /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><TextField select fullWidth label="Estado inicial" value={form.estado} onChange={(e) => setForm((s) => ({ ...s, estado: e.target.value as InvoiceStatus }))}><MenuItem value="PENDIENTE">Pendiente</MenuItem><MenuItem value="FACTURADA">Facturada</MenuItem></TextField></Grid>
          <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth required label="Número de factura" value={form.numeroFactura} onChange={(e) => setForm((s) => ({ ...s, numeroFactura: e.target.value }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Nro Liquidación Compañía" value={form.numeroLiquidacion} onChange={(e) => setForm((s) => ({ ...s, numeroLiquidacion: e.target.value }))} /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth required type="date" label="Emisión" InputLabelProps={{ shrink: true }} value={form.fechaEmision} onChange={(e) => setForm((s) => ({ ...s, fechaEmision: e.target.value }))} /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth type="date" label="Vencimiento" InputLabelProps={{ shrink: true }} value={form.fechaVencimiento} onChange={(e) => setForm((s) => ({ ...s, fechaVencimiento: e.target.value }))} /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth required label="Comisión Facturada" value={form.monto} inputProps={{ inputMode: 'decimal' }} onChange={(e) => setForm((s) => ({ ...s, monto: sanitizeDecimal(e.target.value) }))} helperText="Acepta centavos con coma o punto." /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><TextField fullWidth label="Monto del pago recibido" value={form.montoCobradoInicial} inputProps={{ inputMode: 'decimal', readOnly: Boolean(editing) }} onChange={(e) => setForm((s) => ({ ...s, montoCobradoInicial: sanitizeDecimal(e.target.value) }))} helperText={editing ? 'Los pagos se administran desde Ver detalle.' : 'Podés registrar un cobro inicial, incluso parcial.'} /></Grid>
          <Grid size={12}><Alert severity="warning">Impuestos / IIBB calculados: <strong>{money(Math.max(0, parseDecimal(form.monto) - parseDecimal(form.montoCobradoInicial)), form.moneda)}</strong></Alert></Grid>
          <Grid size={{ xs: 6, md: 4 }}><TextField select fullWidth label="Moneda" value={form.moneda} onChange={(e) => setForm((s) => ({ ...s, moneda: e.target.value as Currency, policyIds: [] }))}><MenuItem value="ARS">ARS</MenuItem><MenuItem value="USD">USD</MenuItem></TextField></Grid>
          <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="URL del comprobante" value={form.comprobanteUrl} onChange={(e) => setForm((s) => ({ ...s, comprobanteUrl: e.target.value }))} /></Grid>
          <Grid size={12}><Autocomplete multiple options={eligiblePolicies} value={eligiblePolicies.filter((p) => form.policyIds.includes(p.id))} getOptionLabel={(p) => `${p.numeroPoliza} · ${p.clienteNombre} · ${money(p.comisionCalculada, form.moneda)}`} onChange={(_, values) => setForm((s) => ({ ...s, policyIds: values.map((p) => p.id) }))} renderInput={(params) => <TextField {...params} label="Pólizas vinculadas" helperText="Se muestran pólizas de la aseguradora y moneda elegidas." />} /></Grid>
          <Grid size={12}><TextField fullWidth multiline minRows={2} label="Notas" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} /></Grid>
        </Grid></DialogContent><DialogActions><Button onClick={() => setFormOpen(false)}>Cancelar</Button><Button variant="contained" disabled={saving || !form.insuranceCompanyId || !form.periodo || !form.numeroFactura || parseDecimal(form.monto) <= 0} onClick={saveInvoice}>Guardar</Button></DialogActions>
      </Dialog>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth><DialogTitle>Detalle de factura {detail?.numeroFactura}</DialogTitle>{detail && <DialogContent dividers>
        <Grid container spacing={2}><Grid size={{ xs: 12, md: 4 }}><Typography variant="caption">Estado</Typography><Box><Chip size="small" color={STATUS_COLORS[detail.estadoCalculado]} label={STATUS_LABELS[detail.estadoCalculado]} /></Box></Grid><Grid size={{ xs: 6, md: 4 }}><Typography variant="caption">Facturado</Typography><Typography fontWeight={700}>{money(detail.monto, detail.moneda)}</Typography></Grid><Grid size={{ xs: 6, md: 4 }}><Typography variant="caption">Cobrado</Typography><Typography fontWeight={700}>{money(detail.montoCobrado, detail.moneda)}</Typography></Grid></Grid>
        {detail.comprobanteUrl && <Link href={detail.comprobanteUrl} target="_blank" rel="noreferrer" sx={{ mt: 2, display: 'inline-flex', gap: 1 }}>Abrir comprobante <ExternalLink size={15} /></Link>}
        <Divider sx={{ my: 2 }} /><Typography variant="subtitle1" fontWeight={800}>Pólizas vinculadas</Typography>{detail.policies.length ? detail.policies.map((policy) => <Chip key={policy.id} sx={{ mr: 1, mt: 1 }} label={`${policy.numeroPoliza} · ${policy.clienteNombre} · ${policy.cuotaActual}/${policy.cuotaTotal}`} />) : <Typography color="text.secondary">Sin pólizas vinculadas.</Typography>}
        <Divider sx={{ my: 2 }} /><Typography variant="subtitle1" fontWeight={800}>Pagos</Typography>{detail.payments.map((item) => <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}><Box><Typography fontWeight={700}>{money(item.monto, detail.moneda)}</Typography><Typography variant="caption">{item.fechaPago} · {item.medioPago || 'Sin medio'} {item.comprobanteUrl && <>· <Link href={item.comprobanteUrl} target="_blank">Comprobante</Link></>}</Typography></Box><IconButton color="error" onClick={() => removePayment(item.id)}><Trash2 size={17} /></IconButton></Box>)}
        {detail.saldoPendiente > 0 && <Card variant="outlined" sx={{ mt: 2 }}><CardContent><Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2 }}>Registrar pago parcial</Typography><Grid container spacing={2}><Grid size={{ xs: 6, md: 3 }}><TextField fullWidth type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={payment.fechaPago} onChange={(e) => setPayment((s) => ({ ...s, fechaPago: e.target.value }))} /></Grid><Grid size={{ xs: 6, md: 3 }}><TextField fullWidth label="Monto" value={payment.monto} inputProps={{ inputMode: 'decimal' }} onChange={(e) => setPayment((s) => ({ ...s, monto: sanitizeDecimal(e.target.value) }))} helperText="Acepta centavos." /></Grid><Grid size={{ xs: 12, md: 3 }}><TextField select fullWidth label="Medio" value={payment.medioPago} onChange={(e) => setPayment((s) => ({ ...s, medioPago: e.target.value }))}><MenuItem value="Transferencia">Transferencia</MenuItem><MenuItem value="Efectivo">Efectivo</MenuItem><MenuItem value="Cheque">Cheque</MenuItem><MenuItem value="Otro">Otro</MenuItem></TextField></Grid><Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="URL comprobante" value={payment.comprobanteUrl} onChange={(e) => setPayment((s) => ({ ...s, comprobanteUrl: e.target.value }))} /></Grid></Grid><Button sx={{ mt: 2 }} variant="contained" startIcon={<CreditCard size={17} />} disabled={saving || parseDecimal(payment.monto) <= 0 || parseDecimal(payment.monto) > detail.saldoPendiente} onClick={addPayment}>Registrar pago</Button></CardContent></Card>}
      </DialogContent>}<DialogActions><Button onClick={() => setDetail(null)}>Cerrar</Button></DialogActions></Dialog>
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}><Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert></Snackbar>
    </Box>
  );
};
